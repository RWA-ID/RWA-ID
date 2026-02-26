/**
 * reserve-slugs.js
 *
 * Proposes a batchReserveNamespaces transaction to the Safe multisig.
 * All slugs are reserved to address(0x1) as a placeholder — update to
 * each platform's real wallet when they come to integrate.
 *
 * Run: npx hardhat run scripts/reserve-slugs.js --network mainnet
 *
 * After running: go to app.safe.global → your Safe → queue → approve + execute
 */
const { ethers } = require("hardhat");

const REGISTRY    = "0xD0B565C7134bDB16Fc3b8A9Cb5fdA003C37930c2";
const SAFE        = "0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab";
const DURATION    = 365 * 24 * 3600;  // 1 year reservation
const PLACEHOLDER = "0x0000000000000000000000000000000000000001"; // update per platform later

// ── Top RWA platforms to reserve ─────────────────────────────────────────────
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
  const [deployer] = await ethers.getSigners();
  const sender = await deployer.getAddress();

  const registry = await ethers.getContractAt("RWAIDv2", REGISTRY);

  console.log("═══════════════════════════════════════════");
  console.log("  RWA ID v2 — Slug Reservation");
  console.log("═══════════════════════════════════════════");
  console.log("Proposer  :", sender);
  console.log("Safe      :", SAFE);
  console.log("Registry  :", REGISTRY);
  console.log("Slugs     :", SLUGS.length);
  console.log("Duration  : 1 year");
  console.log("Reserving → address(0x1) placeholder\n");

  SLUGS.forEach((s) => console.log(" ", s));

  // Encode calldata
  const calldata = registry.interface.encodeFunctionData("batchReserveNamespaces", [
    SLUGS,
    SLUGS.map(() => PLACEHOLDER),
    DURATION,
  ]);

  // Get current Safe nonce
  const safeAbi = ["function nonce() view returns (uint256)"];
  const safeContract = new ethers.Contract(SAFE, safeAbi, deployer.provider);
  const nonce = await safeContract.nonce();
  console.log("\nSafe nonce:", nonce.toString());

  // Build Safe transaction object
  const safeTxData = {
    to:             REGISTRY,
    value:          0n,
    data:           calldata,
    operation:      0,        // CALL
    safeTxGas:      0n,
    baseGas:        0n,
    gasPrice:       0n,
    gasToken:       ethers.ZeroAddress,
    refundReceiver: ethers.ZeroAddress,
    nonce:          nonce,
  };

  // EIP-712 domain (Safe v1.3+ — no name/version)
  const domain = { chainId: 1, verifyingContract: SAFE };

  const types = {
    SafeTx: [
      { name: "to",             type: "address" },
      { name: "value",          type: "uint256" },
      { name: "data",           type: "bytes"   },
      { name: "operation",      type: "uint8"   },
      { name: "safeTxGas",      type: "uint256" },
      { name: "baseGas",        type: "uint256" },
      { name: "gasPrice",       type: "uint256" },
      { name: "gasToken",       type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "nonce",          type: "uint256" },
    ],
  };

  // Compute Safe tx hash + sign with EIP-712
  const txHash   = ethers.TypedDataEncoder.hash(domain, types, safeTxData);
  const signature = await deployer.signTypedData(domain, types, safeTxData);

  console.log("\nSafe tx hash:", txHash);

  // Submit to Safe Transaction Service
  const payload = {
    to:                      safeTxData.to,
    value:                   "0",
    data:                    calldata,
    operation:               0,
    safeTxGas:               "0",
    baseGas:                 "0",
    gasPrice:                "0",
    gasToken:                ethers.ZeroAddress,
    refundReceiver:          ethers.ZeroAddress,
    nonce:                   nonce.toString(),
    contractTransactionHash: txHash,
    sender:                  sender,
    signature:               signature,
    origin:                  "RWA ID v2 — Slug Reservations",
  };

  console.log("\nSubmitting to Safe Transaction Service...");
  const res = await fetch(
    `${SAFE_TX_SERVICE}/api/v1/safes/${SAFE}/multisig-transactions/`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    }
  );

  if (res.status === 201) {
    console.log("✅ Transaction proposed to Safe!");
    console.log(`\n→ Approve and execute at:`);
    console.log(`  https://app.safe.global/eth:${SAFE}`);
  } else {
    const err = await res.text();
    console.error("❌ Safe API error:", res.status, err);
    console.log("\n── Manual fallback ──");
    console.log("To (contract) :", REGISTRY);
    console.log("Calldata      :", calldata);
    console.log("\nPaste these into Safe → New Transaction → Contract Interaction");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
