/**
 * set-trusted-signer.js
 *
 * Proposes a setTrustedSigner() transaction to the Safe multisig.
 * Run: npx hardhat run scripts/set-trusted-signer.js --network mainnet
 *
 * After running: go to app.safe.global → your Safe → queue → approve + execute
 */
const { ethers } = require("hardhat");

const RESOLVER    = "0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1";
const SAFE        = "0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab";
const NEW_SIGNER  = "0xC9fACcf3a77b553375017efFEe441D9770fAA723";

const SAFE_TX_SERVICE = "https://safe-transaction-mainnet.safe.global";

async function main() {
  const [deployer] = await ethers.getSigners();
  const sender = await deployer.getAddress();

  const resolverAbi = ["function setTrustedSigner(address signer_) external"];
  const resolver = new ethers.Contract(RESOLVER, resolverAbi, deployer);

  console.log("═══════════════════════════════════════════");
  console.log("  RWA ID — Update Trusted Signer");
  console.log("═══════════════════════════════════════════");
  console.log("Proposer    :", sender);
  console.log("Safe        :", SAFE);
  console.log("Resolver    :", RESOLVER);
  console.log("New signer  :", NEW_SIGNER);
  console.log("");

  const calldata = resolver.interface.encodeFunctionData("setTrustedSigner", [NEW_SIGNER]);

  // Get current Safe nonce
  const safeAbi = ["function nonce() view returns (uint256)"];
  const safeContract = new ethers.Contract(SAFE, safeAbi, deployer.provider);
  const nonce = await safeContract.nonce();
  console.log("Safe nonce  :", nonce.toString());

  const safeTxData = {
    to:             RESOLVER,
    value:          0n,
    data:           calldata,
    operation:      0,
    safeTxGas:      0n,
    baseGas:        0n,
    gasPrice:       0n,
    gasToken:       ethers.ZeroAddress,
    refundReceiver: ethers.ZeroAddress,
    nonce:          nonce,
  };

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

  const txHash   = ethers.TypedDataEncoder.hash(domain, types, safeTxData);
  const signature = await deployer.signTypedData(domain, types, safeTxData);
  console.log("Safe tx hash:", txHash);

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
    origin:                  "RWA ID — Set Trusted Signer",
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
    console.log("Contract  :", RESOLVER);
    console.log("Calldata  :", calldata);
    console.log("\nPaste these into Safe → New Transaction → Contract Interaction");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
