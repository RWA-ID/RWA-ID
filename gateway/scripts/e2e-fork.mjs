/**
 * e2e-fork.mjs — prove the Worker against the real mainnet resolver.
 *
 *   # terminal 1: a local copy of Robinhood Chain (has the live RWAIDv4)
 *   cd protocol && FORK_ROBINHOOD=1 npx hardhat node
 *   # terminal 2
 *   GATEWAY_SIGNER_PRIVATE_KEY=… ALCHEMY_API_KEY=… node gateway/scripts/e2e-fork.mjs
 *
 * On the fork it creates namespace "gwtest" on the LIVE v4 address and has the
 * platform claim alice.gwtest for a client. Then, on real Ethereum mainnet, it
 * resolves names with viem's getEnsAddress through the ENS Universal Resolver
 * and the live wildcard resolver 0x765FB675…, with the CCIP-Read hop answered
 * by this Worker's fetch handler. Nothing is sent to either real chain.
 */
import { createPublicClient, createTestClient, createWalletClient, encodePacked, http, keccak256, parseAbi, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import worker from "../src/index.js";

const FORK = process.env.FORK_RPC || "http://127.0.0.1:8545";
const ALCHEMY = process.env.ALCHEMY_API_KEY;
const V4 = "0xb99c4333DEb732B30D83f03cAb92fe855B21999a";
const V3 = "0x6413e9E6A0D4e05557463A66C34E18192324A2C7";
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const USDG_HOLDER = "0x2D037f66b9e0EDE90c2080558a7d3FF7BE36E9A1";
const V3_HOLDER = "0x0104c88Ea4f55c26df89F5cd3eC62F3C8288D69b"; // hector.textv3.rwa-id.eth
const TRUSTED_SIGNER = "0xC9fACcf3a77b553375017efFEe441D9770fAA723";

if (!process.env.GATEWAY_SIGNER_PRIVATE_KEY || !ALCHEMY) throw new Error("Set GATEWAY_SIGNER_PRIVATE_KEY and ALCHEMY_API_KEY");

const ok = (cond, msg) => {
  if (!cond) throw new Error(`FAILED: ${msg}`);
  console.log(`  ✓ ${msg}`);
};

// ─── 1. Set up a v4 namespace and a claim on the fork ─────────────────────────
const rh = { id: 4663, name: "rh-fork", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [FORK] } } };
const fork = createPublicClient({ chain: rh, transport: http(FORK) });
const testClient = createTestClient({ chain: rh, mode: "hardhat", transport: http(FORK) });
// Hardhat's well-known dev keys; they only hold ETH on the local fork.
const platform = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const client = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
const wallet = (account) => createWalletClient({ account, chain: rh, transport: http(FORK) });

const v4Abi = parseAbi([
  "function createProject(string slug, address treasury, uint256 claimFee, bool transferable) returns (uint256)",
  "function projectIdBySlugHash(bytes32) view returns (uint256)",
  "function updateMerkleRoot(uint256 projectId, bytes32 root, uint256 total)",
  "function fundSponsorship(uint256 projectId, uint256 amount)",
  "function claimFor(uint256 projectId, address claimer, string label, bytes32[] proof)",
  "function effectiveClaimFee(uint256) view returns (uint256)",
]);
const erc20 = parseAbi(["function transfer(address,uint256) returns (bool)", "function approve(address,uint256) returns (bool)"]);

async function send(account, address, abi, functionName, args) {
  const hash = await wallet(account).writeContract({ address, abi, functionName, args });
  const r = await fork.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${functionName} reverted`);
}

// Hardhat can't execute at the fork block itself for chain 4663 (it has no hardfork
// history for it); one local block moves "latest" past it.
await testClient.mine({ blocks: 1 });
console.log(`\nFork at block ${await fork.getBlockNumber()} (chain ${await fork.getChainId()})`);
const slugHash = keccak256(toBytes("gwtest"));
if ((await fork.readContract({ address: V4, abi: v4Abi, functionName: "projectIdBySlugHash", args: [slugHash] })) !== 0n) {
  throw new Error("gwtest already exists on this fork — restart the hardhat node");
}
await send(platform, V4, v4Abi, "createProject", ["gwtest", platform.address, 0n, false]);
const pid = await fork.readContract({ address: V4, abi: v4Abi, functionName: "projectIdBySlugHash", args: [slugHash] });
// One-leaf allowlist: the root is the leaf and the proof is empty.
const leaf = keccak256(encodePacked(["address", "bytes32"], [client.address, keccak256(toBytes("alice"))]));
await send(platform, V4, v4Abi, "updateMerkleRoot", [pid, leaf, 1n]);
const fee = await fork.readContract({ address: V4, abi: v4Abi, functionName: "effectiveClaimFee", args: [pid] });
await testClient.impersonateAccount({ address: USDG_HOLDER });
await testClient.setBalance({ address: USDG_HOLDER, value: 10n ** 18n });
const holderWallet = createWalletClient({ account: USDG_HOLDER, chain: rh, transport: http(FORK) });
await fork.waitForTransactionReceipt({ hash: await holderWallet.writeContract({ address: USDG, abi: erc20, functionName: "transfer", args: [platform.address, fee] }) });
await send(platform, USDG, erc20, "approve", [V4, fee]);
await send(platform, V4, v4Abi, "fundSponsorship", [pid, fee]);
await send(platform, V4, v4Abi, "claimFor", [pid, client.address, "alice", []]);
console.log(`  · gwtest = project #${pid}; alice.gwtest claimed for ${client.address}\n`);

// ─── 2. Resolve on real mainnet, CCIP-Read answered by the Worker ─────────────
const env = {
  GATEWAY_SIGNER_PRIVATE_KEY: process.env.GATEWAY_SIGNER_PRIVATE_KEY,
  ALCHEMY_API_KEY: ALCHEMY,
  ROBINHOOD_RPC_URL: FORK,
  V4_REGISTRY: V4,
  V3_REGISTRY: V3,
};
const hops = [];
const l1 = createPublicClient({
  chain: mainnet,
  transport: http(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY}`),
  ccipRead: {
    async request({ data, sender, urls }) {
      ok(urls.some((u) => u.includes("gateway.rwa-id.com")), `resolver ${sender.slice(0, 8)}… points CCIP-Read at gateway.rwa-id.com`);
      const res = await worker.fetch(new Request(`https://gateway.rwa-id.com/${sender}/${data}.json`), env);
      const body = await res.json();
      hops.push({ status: res.status, body });
      if (res.status !== 200) throw new Error(`gateway ${res.status}: ${body.error}`);
      ok(body.signer === TRUSTED_SIGNER, "Worker signs as the resolver's trustedSigner");
      return body.data;
    },
  },
});
const resolve = (name) => l1.getEnsAddress({ name: normalize(name) });

ok((await resolve("alice.gwtest.rwa-id.eth")) === client.address, "v4 name (Robinhood Chain) resolves on mainnet to the claimer");
ok((await resolve("hector.textv3.rwa-id.eth")) === V3_HOLDER, "v3 name (mainnet) still resolves to its holder");
ok((await resolve("bob.gwtest.rwa-id.eth")) === null, "unclaimed v4 label resolves to null");

let unknown;
try {
  unknown = await resolve("x.zz9unknownslug.rwa-id.eth");
} catch (e) {
  unknown = "error";
}
ok(unknown === null || unknown === "error", "unknown namespace does not resolve");
ok(hops.at(-1).status === 404, "unknown namespace is a 404 from the Worker, with nothing signed");

// ─── 3. Byte-for-byte parity with the live Replit gateway on a v3 name ─────────
const name = "hector.textv3.rwa-id.eth";
const live = await (await fetch(`https://gateway.rwa-id.com/resolve?name=${name}`)).json();
const mine = await (await worker.fetch(new Request(`https://x/resolve?name=${name}`), env)).json();
ok(mine.signature === live.signature && mine.messageHash === live.messageHash && mine.node === live.node,
  "same signature, digest and node as the live Replit gateway (deterministic ECDSA)");

console.log("\nAll gateway checks passed against mainnet + a Robinhood Chain fork.\n");
