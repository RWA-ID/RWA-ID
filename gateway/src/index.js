/**
 * RWA ID CCIP-Read gateway — Cloudflare Worker.
 *
 * Answers addr() for <label>.<slug>.rwa-id.eth on behalf of the mainnet wildcard
 * resolver RwaIdWildcardResolverV2 (0x765FB675…45eb1), which reverts with
 * OffchainLookup to this URL and accepts any response signed by its trustedSigner.
 *
 * Two registries, looked up in this order:
 *   1. RWAIDv4 on Robinhood Chain (4663) — every new namespace lives here.
 *   2. RWAIDv3 on Ethereum mainnet     — legacy namespaces, read only when v4 has
 *                                        no project for the slug.
 * v4 goes first so that a slug created on v3 later can never shadow a v4 namespace.
 *
 * Wire format (unchanged from the Replit gateway, which the resolver depends on):
 *   messageHash = EIP-191( keccak256(abi.encodePacked(registry, node, addr)) )
 *   response    = abi.encode(bytes32 node, address addr, bytes32 messageHash, bytes sig)
 *
 * Never sign something we did not read: every RPC failure is a 500, and a v4 read
 * that errors is never treated as "no project" (that would fall through to v3 and
 * sign v3's answer for a v4 name).
 */
import {
  createPublicClient,
  decodeAbiParameters,
  encodeAbiParameters,
  encodePacked,
  fallback,
  hashMessage,
  http,
  isAddress,
  keccak256,
  toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const robinhood = {
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
};

const REGISTRY_ABI = [
  { type: "function", name: "projectIdBySlugHash", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "nameNodeFromHash", stateMutability: "view", inputs: [{ type: "uint256" }, { type: "bytes32" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "resolveAddr", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "address" }] },
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ─── Setup (per isolate, keyed on env so tests can swap it) ─────────────────────

let cached;
function setup(env) {
  if (cached && cached.env === env) return cached;

  const key = (env.GATEWAY_SIGNER_PRIVATE_KEY || "").trim();
  if (!key) throw new HttpError(500, "Gateway misconfigured: no signer");
  const v4 = (env.V4_REGISTRY || "").trim();
  const v3 = (env.V3_REGISTRY || "").trim();
  // No fallback addresses on purpose: a gateway reading the wrong registry still
  // produces valid signatures, and nothing downstream can tell.
  if (!isAddress(v4) || !isAddress(v3)) throw new HttpError(500, "Gateway misconfigured: registry");

  const alchemy = (env.ALCHEMY_API_KEY || "").trim();
  const rhUrls = [
    env.ROBINHOOD_RPC_URL,
    alchemy && `https://robinhood-mainnet.g.alchemy.com/v2/${alchemy}`,
    "https://rpc.mainnet.chain.robinhood.com",
  ].filter(Boolean);
  const l1Urls = [
    env.MAINNET_RPC_URL,
    alchemy && `https://eth-mainnet.g.alchemy.com/v2/${alchemy}`,
    "https://ethereum-rpc.publicnode.com",
  ].filter(Boolean);
  const transport = (urls) => fallback(urls.map((u) => http(u, { timeout: 8000, retryCount: 1 })));

  cached = {
    env,
    account: privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`),
    registries: [
      { version: "v4", address: v4, client: createPublicClient({ chain: robinhood, transport: transport(rhUrls) }) },
      { version: "v3", address: v3, client: createPublicClient({ chain: mainnet, transport: transport(l1Urls) }) },
    ],
    rpcCount: { robinhood: rhUrls.length, mainnet: l1Urls.length },
  };
  return cached;
}

// ─── Name handling ──────────────────────────────────────────────────────────────

const labelhash = (s) => keccak256(toBytes(s));

/** label.slug.rwa-id.eth → { label, slug }; anything else is a 400. */
export function parseName(name) {
  const parts = String(name).trim().toLowerCase().split(".");
  if (parts.length !== 4 || parts[2] !== "rwa-id" || parts[3] !== "eth" || !parts[0] || !parts[1]) {
    throw new HttpError(400, "Name must be label.slug.rwa-id.eth");
  }
  return { label: parts[0], slug: parts[1] };
}

/** DNS wire format (RFC 1035) → dotted name. Rejects anything malformed. */
export function dnsDecode(hex) {
  const bytes = toBytes(hex);
  const labels = [];
  let i = 0;
  for (;;) {
    if (i >= bytes.length) throw new HttpError(400, "Malformed DNS name");
    const len = bytes[i++];
    if (len === 0) break;
    if (i + len > bytes.length) throw new HttpError(400, "Malformed DNS name");
    labels.push(new TextDecoder("utf-8", { fatal: true }).decode(bytes.slice(i, i + len)));
    i += len;
  }
  return labels.join(".");
}

// ─── Lookup + signing ───────────────────────────────────────────────────────────

async function lookup(ctx, label, slug) {
  const slugHash = labelhash(slug);
  for (const reg of ctx.registries) {
    const read = (functionName, args) => reg.client.readContract({ address: reg.address, abi: REGISTRY_ABI, functionName, args });
    // A thrown read propagates as a 500 — never as "not found here, try the next one".
    const projectId = await read("projectIdBySlugHash", [slugHash]);
    if (projectId === 0n) continue;
    const node = await read("nameNodeFromHash", [projectId, labelhash(label)]);
    const addr = await read("resolveAddr", [node]);
    return { registry: reg, projectId, node, addr };
  }
  throw new HttpError(404, "Unknown slug/project");
}

async function sign(ctx, found) {
  const rawHash = keccak256(encodePacked(["address", "bytes32", "address"], [found.registry.address, found.node, found.addr]));
  const signature = await ctx.account.signMessage({ message: { raw: rawHash } });
  const messageHash = hashMessage({ raw: rawHash });
  const encoded = encodeAbiParameters(
    [{ type: "bytes32" }, { type: "address" }, { type: "bytes32" }, { type: "bytes" }],
    [found.node, found.addr, messageHash, signature]
  );
  return { rawHash, messageHash, signature, encoded };
}

// ─── HTTP ───────────────────────────────────────────────────────────────────────

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS, ...extra } });

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/** Strip URLs (which can carry the Alchemy key) out of anything sent to a client. */
const safeError = (e) => String(e?.shortMessage ?? e?.message ?? e).replace(/https?:\/\/\S+/gi, "[rpc]").slice(0, 300);

async function handleCcipRead(ctx, dataHex) {
  const data = dataHex.startsWith("0x") ? dataHex : `0x${dataHex}`;
  let nameBytes;
  try {
    [nameBytes] = decodeAbiParameters([{ type: "bytes" }, { type: "bytes" }], data);
  } catch {
    throw new HttpError(400, "Malformed callData");
  }
  const { label, slug } = parseName(dnsDecode(nameBytes));
  const found = await lookup(ctx, label, slug);
  const { encoded } = await sign(ctx, found);
  return json({ data: encoded, signer: ctx.account.address }, 200, NO_STORE);
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "GET" && request.method !== "POST") throw new HttpError(405, "Method not allowed");

  if (path === "/") return json({ ok: true, service: "rwaid-gateway", runtime: "cloudflare-worker" });

  const ctx = setup(env);

  if (path === "/health") {
    // Tri-state per chain: a throttled RPC must read as "error", not as a wrong chain.
    const chains = {};
    for (const reg of ctx.registries) {
      try {
        chains[reg.version] = { chainId: String(await reg.client.getChainId()), registry: reg.address };
      } catch (e) {
        chains[reg.version] = { error: safeError(e), registry: reg.address };
      }
    }
    const ok = Object.values(chains).every((c) => !c.error);
    return json({ ok, signer: ctx.account.address, registries: chains, rpcs: ctx.rpcCount }, ok ? 200 : 503, NO_STORE);
  }

  // Debug read: what the gateway would sign for a name.
  if (path === "/resolve" || path === "/ccip") {
    const name = url.searchParams.get("name");
    if (!name) throw new HttpError(400, "Missing ?name=");
    const { label, slug } = parseName(name);
    const found = await lookup(ctx, label, slug);
    const s = await sign(ctx, found);
    if (path === "/ccip") return new Response(s.encoded, { headers: { "Content-Type": "text/plain", ...CORS, ...NO_STORE } });
    return json(
      {
        name: `${label}.${slug}.rwa-id.eth`,
        registry: found.registry.address,
        registryVersion: found.registry.version,
        projectId: found.projectId.toString(),
        nameHash: labelhash(label),
        node: found.node,
        address: found.addr,
        messageHash: s.messageHash,
        signature: s.signature,
      },
      200,
      NO_STORE
    );
  }

  // EIP-3668: GET /{sender}/{data}.json, or POST with {sender, data} in the body.
  const m = path.match(/^\/(0x[0-9a-fA-F]{40})\/(0x[0-9a-fA-F]*)(?:\.json)?$/);
  if (m && request.method === "GET") return handleCcipRead(ctx, m[2]);
  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "Expected JSON body");
    }
    if (typeof body?.data !== "string" || !/^0x[0-9a-fA-F]*$/.test(body.data)) throw new HttpError(400, "Missing data");
    return handleCcipRead(ctx, body.data);
  }

  throw new HttpError(404, "Not found");
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status >= 500) console.error("gateway error:", safeError(e));
      return json({ error: e instanceof HttpError ? e.message : safeError(e) }, status, NO_STORE);
    }
  },
};
