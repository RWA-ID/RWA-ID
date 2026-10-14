/**
 * e2e-offchain.mjs — rehearse the switch to RwaIdOffchainResolver on forks of both chains.
 *
 *   # terminal 1: Robinhood Chain fork (has the live RWAIDv4.1)
 *   cd protocol && FORK_ROBINHOOD=1 npx hardhat node --port 8545
 *   # terminal 2: Ethereum mainnet fork (has rwa-id.eth, ENS and the Universal Resolver)
 *   anvil --port 8546 --fork-url <mainnet RPC>   (hardhat node hits EDR #911 on mainnet)
 *   # terminal 3
 *   GATEWAY_SIGNER_PRIVATE_KEY=… GATEWAY_V2_SIGNER_PRIVATE_KEY=… ALCHEMY_API_KEY=… node gateway/scripts/e2e-offchain.mjs
 *
 * On the Robinhood fork: deploys RWAIDRecords, creates namespace "gwtest", claims
 * joe.gwtest for a client and has the client set BTC, SOL, default-EVM and text
 * records. On the mainnet fork: deploys RwaIdOffchainResolver trusting the new
 * signer, and (as rwa-id.eth's owner) points rwa-id.eth at it. Then resolves
 * through the real ENS Universal Resolver with viem, the CCIP-Read hop answered
 * by this Worker's fetch handler. Nothing is sent to either real chain.
 */
import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient, createTestClient, createWalletClient, encodePacked, http, keccak256, namehash, parseAbi, toBytes, toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import worker from "../src/index.js";

const RH = process.env.RH_FORK || "http://127.0.0.1:8545";
const L1 = process.env.L1_FORK || "http://127.0.0.1:8546";
const V4 = "0x85B09167aB330641f8e5F73E2e904C75FDFa8132";
const V3 = "0x6413e9E6A0D4e05557463A66C34E18192324A2C7";
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const USDG_HOLDER = "0x2D037f66b9e0EDE90c2080558a7d3FF7BE36E9A1";
const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const RWAID_OWNER = "0x5f11a48230f7CdaB91A2361576239091E4b1165b"; // owns rwa-id.eth in the ENS registry
const V3_HOLDER = "0x0104c88Ea4f55c26df89F5cd3eC62F3C8288D69b"; // hector.textv3.rwa-id.eth
const ART = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../protocol/artifacts/contracts");

const ok = (cond, msg) => { if (!cond) throw new Error(`FAILED: ${msg}`); console.log(`  ✓ ${msg}`); };
const artifact = (name) => JSON.parse(fs.readFileSync(`${ART}/${name}.sol/${name}.json`, "utf8"));

const chainRH = { id: 4663, name: "rh-fork", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RH] } } };
const rh = createPublicClient({ chain: chainRH, transport: http(RH) });
const rhTest = createTestClient({ chain: chainRH, mode: "hardhat", transport: http(RH) });
const l1 = createPublicClient({ chain: mainnet, transport: http(L1) });
const l1Test = createTestClient({ chain: mainnet, mode: process.env.L1_MODE || "anvil", transport: http(L1) }); // anvil: hardhat cannot fork mainnet here (EDR #911)

const platform = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const client = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
const v2Signer = privateKeyToAccount(process.env.GATEWAY_V2_SIGNER_PRIVATE_KEY);

async function send(pub, wallet, args) {
  const hash = await wallet.writeContract(args);
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${args.functionName} reverted`);
  return r;
}
async function deploy(pub, wallet, name, args) {
  const a = artifact(name);
  const hash = await wallet.deployContract({ abi: a.abi, bytecode: a.bytecode, args });
  return (await pub.waitForTransactionReceipt({ hash })).contractAddress;
}

// ─── Robinhood fork: records + a claimed name ────────────────────────────────
await rhTest.mine({ blocks: 1 });
const pw = createWalletClient({ account: platform, chain: chainRH, transport: http(RH) });
const cw = createWalletClient({ account: client, chain: chainRH, transport: http(RH) });
const v4 = { address: V4, abi: artifact("RWAIDv4").abi };
const RECORDS = await deploy(rh, pw, "RWAIDRecords", [V4]);
const records = { address: RECORDS, abi: artifact("RWAIDRecords").abi };

await send(rh, pw, { ...v4, functionName: "createProject", args: ["gwtest", platform.address, 0n, false] });
const pid = await rh.readContract({ ...v4, functionName: "projectIdBySlugHash", args: [keccak256(toBytes("gwtest"))] });
const leaf = keccak256(encodePacked(["address", "bytes32"], [client.address, keccak256(toBytes("joe"))]));
await send(rh, pw, { ...v4, functionName: "updateMerkleRoot", args: [pid, leaf, 1n] });
await rhTest.impersonateAccount({ address: USDG_HOLDER });
await rhTest.setBalance({ address: USDG_HOLDER, value: 10n ** 18n });
const hw = createWalletClient({ account: USDG_HOLDER, chain: chainRH, transport: http(RH) });
const erc20 = parseAbi(["function transfer(address,uint256) returns (bool)", "function approve(address,uint256) returns (bool)"]);
await send(rh, hw, { address: USDG, abi: erc20, functionName: "transfer", args: [client.address, 1_000_000n] });
await send(rh, cw, { address: USDG, abi: erc20, functionName: "approve", args: [V4, 1_000_000n] });
await send(rh, cw, { ...v4, functionName: "claim", args: [pid, "joe", []] });

const node = namehash("joe.gwtest.rwa-id.eth");
const BTC_SCRIPT = "0x00149b7e2b5c0d1e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b"; // a P2WPKH output script
const SOL_KEY = toHex(new Uint8Array(32).fill(7));
const SAFE_ON_EVM = "0x00000000000000000000000000000000000000aa";
await send(rh, cw, {
  ...records, functionName: "setRecords",
  args: [node, [0n, 501n, 0x80000000n], [BTC_SCRIPT, SOL_KEY, SAFE_ON_EVM], ["url", "com.twitter"], ["https://acme.example", "joe"]],
});
console.log(`\nRobinhood fork: RWAIDRecords ${RECORDS}; joe.gwtest.rwa-id.eth held by ${client.address} with BTC/SOL/EVM/text records`);

// ─── Mainnet fork: deploy the resolver and point rwa-id.eth at it ────────────
const deployer = createWalletClient({ account: platform, chain: mainnet, transport: http(L1) });
await l1Test.setBalance({ address: platform.address, value: 10n ** 18n });
const RESOLVER = await deploy(l1, deployer, "RwaIdOffchainResolver",
  [["https://gateway.rwa-id.com/{sender}/{data}.json"], [v2Signer.address], platform.address]);
await l1Test.impersonateAccount({ address: RWAID_OWNER });
await l1Test.setBalance({ address: RWAID_OWNER, value: 10n ** 18n });
const ownerW = createWalletClient({ account: RWAID_OWNER, chain: mainnet, transport: http(L1) });
await send(l1, ownerW, { address: ENS_REGISTRY, abi: parseAbi(["function setResolver(bytes32,address)"]), functionName: "setResolver", args: [namehash("rwa-id.eth"), RESOLVER] });
const now = await l1.readContract({ address: ENS_REGISTRY, abi: parseAbi(["function resolver(bytes32) view returns (address)"]), functionName: "resolver", args: [namehash("rwa-id.eth")] });
ok(now.toLowerCase() === RESOLVER.toLowerCase(), `mainnet fork: rwa-id.eth resolver → RwaIdOffchainResolver ${RESOLVER}`);

// ─── Resolve through the Universal Resolver, CCIP-Read answered by the Worker ─
const env = {
  GATEWAY_SIGNER_PRIVATE_KEY: process.env.GATEWAY_SIGNER_PRIVATE_KEY,
  GATEWAY_V2_SIGNER_PRIVATE_KEY: process.env.GATEWAY_V2_SIGNER_PRIVATE_KEY,
  ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
  ROBINHOOD_RPC_URL: RH,
  MAINNET_RPC_URL: L1,
  V4_REGISTRY: V4,
  V3_REGISTRY: V3,
  OFFCHAIN_RESOLVER: RESOLVER,
  RECORDS_ADDRESS: RECORDS,
};
const ens = createPublicClient({
  chain: mainnet,
  transport: http(L1),
  ccipRead: {
    async request({ data, sender }) {
      const res = await worker.fetch(new Request(`https://gateway.rwa-id.com/${sender}/${data}.json`), env);
      const body = await res.json();
      if (res.status !== 200) throw new Error(`gateway ${res.status}: ${body.error}`);
      return body.data;
    },
  },
});
const n = (s) => normalize(s);

ok((await ens.getEnsAddress({ name: n("joe.gwtest.rwa-id.eth") })) === client.address, "ETH address = the holder");
ok((await ens.getEnsAddress({ name: n("joe.gwtest.rwa-id.eth"), coinType: 0n }))?.toLowerCase() === BTC_SCRIPT, "Bitcoin (coin type 0) = the holder's record");
ok((await ens.getEnsAddress({ name: n("joe.gwtest.rwa-id.eth"), coinType: 501n }))?.toLowerCase() === SOL_KEY, "Solana (coin type 501) = the holder's record");
ok((await ens.getEnsAddress({ name: n("joe.gwtest.rwa-id.eth"), coinType: 0x80000000n | 8453n }))?.toLowerCase() === SAFE_ON_EVM, "Base (ENSIP-11) falls back to the default-EVM record");
ok((await ens.getEnsText({ name: n("joe.gwtest.rwa-id.eth"), key: "url" })) === "https://acme.example", "text(url) = the holder's record");
ok((await ens.getEnsText({ name: n("joe.gwtest.rwa-id.eth"), key: "com.twitter" })) === "joe", "text(com.twitter) = the holder's record");
ok((await ens.getEnsAddress({ name: n("ana.gwtest.rwa-id.eth") })) === null, "unclaimed name resolves to nothing (signed empty answer)");
ok((await ens.getEnsAddress({ name: n("x.zz9unknown.rwa-id.eth") })) === null, "unknown namespace resolves to nothing");
ok((await ens.getEnsAddress({ name: n("hector.textv3.rwa-id.eth") })) === V3_HOLDER, "legacy v3 name still resolves to its holder");

// Records follow the holder: revoke the name and everything goes empty.
const tokenId = (await rh.readContract({ ...v4, functionName: "nextTokenId" })) - 1n;
await send(rh, pw, { ...v4, functionName: "revokeIdentity", args: [pid, tokenId] });
ok((await ens.getEnsAddress({ name: n("joe.gwtest.rwa-id.eth") })) === null, "after revocation the name resolves to nothing");
ok((await ens.getEnsAddress({ name: n("joe.gwtest.rwa-id.eth"), coinType: 0n })) === null, "…and its Bitcoin record is gone too");

console.log("\nAll offchain-resolver checks passed against forks of Robinhood Chain and Ethereum.\n");
