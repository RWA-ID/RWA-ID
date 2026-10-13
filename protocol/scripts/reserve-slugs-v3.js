/**
 * reserve-slugs-v3.js
 *
 * Queues a batchReserveNamespaces transaction in the Safe for RWAIDv3.
 * The v2 reservations do not carry over — reservedTo lives in the contract's
 * own storage, so a new registry starts with every namespace unclaimed.
 *
 * Slugs are reserved to address(0x1), which nobody controls, so the namespace
 * is locked against squatters. When a platform actually integrates, the Safe
 * calls reserveNamespace(slug, theirWallet, duration) again to reassign it.
 * Reservations self-clean on expiry: createProject deletes an expired one and
 * lets the caller through.
 *
 *   npx hardhat run scripts/reserve-slugs-v3.js --network mainnet
 *      → dry run: prints the slugs, the calldata and the Safe tx hash
 *
 *   SUBMIT=1 npx hardhat run scripts/reserve-slugs-v3.js --network mainnet
 *      → signs and queues it in the Safe (still needs approval + execution
 *        from the owners at app.safe.global)
 */
const { ethers } = require("hardhat");

const REGISTRY    = "0x6413e9E6A0D4e05557463A66C34E18192324A2C7"; // RWAIDv3
const SAFE        = "0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab";
const DURATION    = 365 * 24 * 3600; // 1 year
const PLACEHOLDER = "0x0000000000000000000000000000000000000001";

// Same list reserved on v2.
const SLUGS = [
  // Institutional / securities
  "securitize", "ondo", "superstate", "backed", "archax",
  // Credit / lending
  "centrifuge", "maple", "goldfinch", "credix", "clearpool",
  // Real estate
  "realt", "lofty", "propy", "homebase", "tangible",
  // Infrastructure / compliance
  "polymesh", "tokeny", "realio", "defactor", "fasset",
  // Commodities / funds
  "openeden", "swarm", "bitbond", "finblox", "parcl",
];

const SAFE_TX_SERVICE = "https://safe-transaction-mainnet.safe.global";

async function main() {
  const [proposer] = await ethers.getSigners();
  const sender = await proposer.getAddress();
  const registry = await ethers.getContractAt("RWAIDv3", REGISTRY);

  console.log("RWA ID v3 — namespace reservations");
  console.log(`  registry : ${REGISTRY}`);
  console.log(`  safe     : ${SAFE}`);
  console.log(`  proposer : ${sender}`);
  console.log(`  slugs    : ${SLUGS.length}, reserved to ${PLACEHOLDER} for 1 year\n`);

  // A slug already registered as a project makes the whole batch revert.
  const taken = [];
  for (const slug of SLUGS) {
    const sh = ethers.keccak256(ethers.toUtf8Bytes(slug));
    if ((await registry.projectIdBySlugHash(sh)) !== 0n) taken.push(slug);
  }
  if (taken.length) throw new Error(`Already registered on v3, batch would revert: ${taken.join(", ")}`);
  console.log(`  ✓ none of the ${SLUGS.length} slugs are registered on v3 yet\n`);

  const calldata = registry.interface.encodeFunctionData("batchReserveNamespaces", [
    SLUGS,
    SLUGS.map(() => PLACEHOLDER),
    DURATION,
  ]);

  // Confirm the Safe still owns the registry, or the call reverts on execution.
  const owner = await registry.owner();
  if (owner.toLowerCase() !== SAFE.toLowerCase()) {
    throw new Error(`Registry owner is ${owner}, not the Safe — this batch would revert`);
  }
  console.log(`  ✓ registry owner is the Safe\n`);

  const safe = new ethers.Contract(
    SAFE,
    ["function nonce() view returns (uint256)", "function getThreshold() view returns (uint256)",
     "function getOwners() view returns (address[])"],
    proposer.provider,
  );
  const nonce = await safe.nonce();
  const threshold = await safe.getThreshold();
  const owners = await safe.getOwners();
  console.log(`  safe nonce ${nonce} · threshold ${threshold} of ${owners.length}`);
  console.log(`  proposer is an owner: ${owners.some(o => o.toLowerCase() === sender.toLowerCase())}\n`);

  const safeTx = {
    to: REGISTRY,
    value: 0n,
    data: calldata,
    operation: 0, // CALL
    safeTxGas: 0n,
    baseGas: 0n,
    gasPrice: 0n,
    gasToken: ethers.ZeroAddress,
    refundReceiver: ethers.ZeroAddress,
    nonce,
  };

  // Safe v1.3+ EIP-712 domain (no name/version fields)
  const domain = { chainId: 1, verifyingContract: SAFE };
  const types = {
    SafeTx: [
      { name: "to", type: "address" }, { name: "value", type: "uint256" },
      { name: "data", type: "bytes" }, { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" }, { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" }, { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" }, { name: "nonce", type: "uint256" },
    ],
  };

  const txHash = ethers.TypedDataEncoder.hash(domain, types, safeTx);
  console.log(`  calldata    : ${calldata.length} chars, selector ${calldata.slice(0, 10)}`);
  console.log(`  safe tx hash: ${txHash}`);

  if (!process.env.SUBMIT) {
    console.log("\nDry run — nothing was signed or queued. Re-run with SUBMIT=1 to queue it.");
    return;
  }

  const signature = await proposer.signTypedData(domain, types, safeTx);
  const res = await fetch(`${SAFE_TX_SERVICE}/api/v1/safes/${SAFE}/multisig-transactions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: safeTx.to, value: "0", data: calldata, operation: 0,
      safeTxGas: "0", baseGas: "0", gasPrice: "0",
      gasToken: ethers.ZeroAddress, refundReceiver: ethers.ZeroAddress,
      nonce: nonce.toString(), contractTransactionHash: txHash,
      sender, signature, origin: "RWA ID v3 — Slug Reservations",
    }),
  });

  if (!res.ok) throw new Error(`Safe service ${res.status}: ${await res.text()}`);
  console.log(`\nQueued ✓  approve and execute at:`);
  console.log(`  https://app.safe.global/transactions/queue?safe=eth:${SAFE}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
