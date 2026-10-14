/**
 * Gateway side of RwaIdOffchainResolver (the ENS offchain-resolver protocol).
 *
 * The resolver sends callData = resolve(bytes name, bytes data), where `data` is
 * the original ENS query: addr(node), addr(node, coinType), text(node, key) or
 * contenthash(node). We answer with
 *
 *   abi.encode(bytes result, uint64 expires, bytes sig)
 *   sig = sign_raw(keccak256(0x1900 ‖ resolver ‖ expires ‖ keccak256(callData) ‖ keccak256(result)))
 *
 * so every signature is bound to this resolver, this exact query and this exact
 * answer, and expires in minutes.
 *
 * Where answers come from:
 *   - ETH address (coin type 60): the name's holder, read from the registry.
 *   - other coin types and text records: RWAIDRecords on Robinhood Chain, as set
 *     by the current holder. EVM chains (ENSIP-11 coin types) fall back to the
 *     holder's default-EVM record (coin type 0x80000000), then to the holder.
 *   - legacy v3 names (mainnet registry) have an ETH address only.
 * A name that does not exist gets a signed empty answer ("no record"), not an
 * error. A failed read is still an error, and nothing is signed.
 */
import {
  concat,
  decodeFunctionData,
  encodeAbiParameters,
  isAddress,
  keccak256,
  namehash,
  numberToHex,
  parseAbi,
  toBytes,
  zeroAddress,
} from "viem";

export const RESOLVE_ABI = parseAbi(["function resolve(bytes name, bytes data) view returns (bytes, uint64, bytes)"]);
const PROFILE_ABI = parseAbi([
  "function addr(bytes32 node) view returns (address)",
  "function addr(bytes32 node, uint256 coinType) view returns (bytes)",
  "function text(bytes32 node, string key) view returns (string)",
  "function contenthash(bytes32 node) view returns (bytes)",
]);
const RECORDS_ABI = parseAbi([
  "function addr(bytes32 node, uint256 coinType) view returns (bytes)",
  "function text(bytes32 node, string key) view returns (string)",
]);
const REGISTRY_ABI = parseAbi([
  "function projectIdBySlugHash(bytes32) view returns (uint256)",
  "function nameNodeFromHash(uint256, bytes32) view returns (bytes32)",
  "function resolveAddr(bytes32) view returns (address)",
]);

export const RESOLVE_SELECTOR = "0x9061b923";
const COIN_ETH = 60n;
const EVM_FLAG = 0x80000000n;
export const VALIDITY_SECONDS = 300;

const labelhash = (s) => keccak256(toBytes(s));

/** Which registry holds `label.slug`, and who holds the name. null = no such name. */
async function findHolder(ctx, label, slug) {
  for (const reg of ctx.registries) {
    const read = (functionName, args) => reg.client.readContract({ address: reg.address, abi: REGISTRY_ABI, functionName, args });
    const projectId = await read("projectIdBySlugHash", [labelhash(slug)]);
    if (projectId === 0n) continue;
    const node = await read("nameNodeFromHash", [projectId, labelhash(label)]);
    const holder = await read("resolveAddr", [node]);
    return { registry: reg, node, holder };
  }
  return null;
}

/** The ABI-encoded answer to one ENS profile call. Throws HttpError-like objects on bad input. */
export async function answer(ctx, name, data, fail) {
  let call;
  try {
    call = decodeFunctionData({ abi: PROFILE_ABI, data });
  } catch {
    throw fail(400, "Unsupported resolver profile");
  }

  // The query's node must be the name it was asked about; refuse to answer a
  // mismatched pair rather than sign an answer for a name nobody asked about.
  if (call.args[0].toLowerCase() !== namehash(name).toLowerCase()) throw fail(400, "Node does not match name");

  const empty = () => {
    if (call.functionName === "addr" && call.args.length === 1) return encodeAbiParameters([{ type: "address" }], [zeroAddress]);
    if (call.functionName === "text") return encodeAbiParameters([{ type: "string" }], [""]);
    return encodeAbiParameters([{ type: "bytes" }], ["0x"]);
  };

  const parts = name.split(".");
  if (parts.length !== 4 || parts[2] !== "rwa-id" || parts[3] !== "eth" || !parts[0] || !parts[1]) return empty();
  if (call.functionName === "contenthash") return empty();

  const found = await findHolder(ctx, parts[0], parts[1]);
  if (!found || found.holder === zeroAddress) return empty();
  const { holder, registry } = found;
  const isV4 = registry.version === "v4";

  if (call.functionName === "addr" && call.args.length === 1) {
    return encodeAbiParameters([{ type: "address" }], [holder]);
  }

  const records = isV4 && ctx.records
    ? (functionName, args) => registry.client.readContract({ address: ctx.records, abi: RECORDS_ABI, functionName, args })
    : null;

  if (call.functionName === "addr") {
    const coinType = call.args[1];
    if (coinType === COIN_ETH) return encodeAbiParameters([{ type: "bytes" }], [holder]);
    let value = records ? await records("addr", [found.node, coinType]) : "0x";
    if (value === "0x" && coinType >= EVM_FLAG && coinType < EVM_FLAG * 2n) {
      // ENSIP-11/19: an EVM chain falls back to the default-EVM record, then to the holder.
      if (coinType !== EVM_FLAG && records) value = await records("addr", [found.node, EVM_FLAG]);
      if (value === "0x") value = holder;
    }
    return encodeAbiParameters([{ type: "bytes" }], [value]);
  }

  // text
  const value = records ? await records("text", [found.node, call.args[1]]) : "";
  return encodeAbiParameters([{ type: "string" }], [value]);
}

export function signatureHash(resolver, expires, request, result) {
  return keccak256(concat(["0x1900", resolver, numberToHex(expires, { size: 8 }), keccak256(request), keccak256(result)]));
}

/** Full CCIP-Read response for RwaIdOffchainResolver. */
export async function handleOffchain(ctx, sender, callData, dnsDecode, fail) {
  if (!ctx.offchain) throw fail(503, "Offchain resolver not configured");
  if (sender.toLowerCase() !== ctx.offchain.resolver.toLowerCase()) throw fail(400, "Unknown resolver");

  let name, data;
  try {
    ;[name, data] = decodeFunctionData({ abi: RESOLVE_ABI, data: callData }).args;
  } catch {
    throw fail(400, "Malformed callData");
  }
  const fullName = dnsDecode(name).toLowerCase();
  const result = await answer(ctx, fullName, data, fail);
  const expires = BigInt(Math.floor(Date.now() / 1000) + VALIDITY_SECONDS);
  const sig = await ctx.offchain.account.sign({ hash: signatureHash(ctx.offchain.resolver, expires, callData, result) });
  return encodeAbiParameters([{ type: "bytes" }, { type: "uint64" }, { type: "bytes" }], [result, expires, sig]);
}

export const offchainConfigured = (env) => isAddress((env.OFFCHAIN_RESOLVER || "").trim());
