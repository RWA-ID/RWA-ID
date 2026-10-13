import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeAbiParameters, hashMessage, keccak256, encodePacked, recoverMessageAddress, toHex } from "viem";
import worker, { dnsDecode, parseName } from "../src/index.js";

// A throwaway key: unit tests never touch the real signer.
const TEST_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const TEST_SIGNER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const env = {
  GATEWAY_SIGNER_PRIVATE_KEY: TEST_KEY,
  V4_REGISTRY: "0xb99c4333DEb732B30D83f03cAb92fe855B21999a",
  V3_REGISTRY: "0x6413e9E6A0D4e05557463A66C34E18192324A2C7",
  // Unroutable, so any test that reaches the network fails loudly instead of passing.
  ROBINHOOD_RPC_URL: "http://127.0.0.1:1",
  MAINNET_RPC_URL: "http://127.0.0.1:1",
};
const call = (path, init, e = env) => worker.fetch(new Request(`https://gw.test${path}`, init), e);

const dnsEncode = (name) =>
  toHex(
    new Uint8Array([
      ...name.split(".").flatMap((l) => [l.length, ...new TextEncoder().encode(l)]),
      0,
    ])
  );

test("parseName accepts exactly label.slug.rwa-id.eth, lowercased", () => {
  assert.deepEqual(parseName("Joe.Acme.RWA-ID.eth"), { label: "joe", slug: "acme" });
  for (const bad of ["acme.rwa-id.eth", "a.b.c.rwa-id.eth", "joe.acme.rwa-id.xyz", ".acme.rwa-id.eth", "joe..rwa-id.eth"]) {
    assert.throws(() => parseName(bad), /label\.slug\.rwa-id\.eth/, bad);
  }
});

test("dnsDecode round-trips and rejects truncated input", () => {
  assert.equal(dnsDecode(dnsEncode("joe.acme.rwa-id.eth")), "joe.acme.rwa-id.eth");
  assert.throws(() => dnsDecode("0x036a6f"), /Malformed/); // length 3, only 2 bytes
  assert.throws(() => dnsDecode("0x036a6f65"), /Malformed/); // no terminating zero
});

test("misconfiguration fails closed, never signs", async () => {
  for (const missing of ["GATEWAY_SIGNER_PRIVATE_KEY", "V4_REGISTRY", "V3_REGISTRY"]) {
    const r = await call("/health", {}, { ...env, [missing]: "" });
    assert.equal(r.status, 500, missing);
  }
});

test("an RPC failure is a 500 with no RPC URL in the body, never a signature", async () => {
  const data = encodeAbiParameters([{ type: "bytes" }, { type: "bytes" }], [dnsEncode("joe.acme.rwa-id.eth"), "0x3b3b57de" + "00".repeat(32)]);
  // Every RPC in the fallback list — including the built-in public ones — fails.
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    throw new Error(`connect ECONNREFUSED ${typeof input === "string" ? input : input.url}`);
  };
  let r;
  try {
    r = await call(`/0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1/${data}.json`, {}, { ...env, ALCHEMY_API_KEY: "secretkey123" });
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(r.status, 500);
  const body = await r.text();
  assert.ok(!body.includes("secretkey123") && !body.includes("alchemy.com"), body);
  assert.ok(!body.includes('"data"'));
});

test("malformed requests are 4xx before any RPC call", async () => {
  assert.equal((await call("/0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1/0xdead.json")).status, 400);
  const bad = encodeAbiParameters([{ type: "bytes" }, { type: "bytes" }], [dnsEncode("acme.rwa-id.eth"), "0x3b3b57de"]);
  assert.equal((await call(`/0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1/${bad}.json`)).status, 400);
  assert.equal((await call("/resolve")).status, 400);
  assert.equal((await call("/nope")).status, 404);
  assert.equal((await call("/", { method: "DELETE" })).status, 405);
  assert.equal((await call("/", { method: "OPTIONS" })).status, 204);
});

test("signature scheme matches what RwaIdWildcardResolverV2 recovers", async () => {
  // Same digest the contract documents: EIP-191 over keccak256(registry, node, addr).
  const registry = env.V4_REGISTRY;
  const node = keccak256("0x01");
  const addr = "0x0104c88Ea4f55c26df89F5cd3eC62F3C8288D69b";
  const raw = keccak256(encodePacked(["address", "bytes32", "address"], [registry, node, addr]));
  const { privateKeyToAccount } = await import("viem/accounts");
  const sig = await privateKeyToAccount(TEST_KEY).signMessage({ message: { raw } });
  assert.equal(await recoverMessageAddress({ message: { raw }, signature: sig }), TEST_SIGNER);
  assert.equal(hashMessage({ raw }).length, 66);
});
