/**
 * deploy-mainnet.js
 *
 * Deploys RWA ID v2 on Ethereum mainnet:
 *   1. RWAIDv2  (core registry — uses real USDC)
 *   2. RwaIdWildcardResolverV2 (CCIP-Read resolver with gateway.rwa-id.com)
 *
 * Usage:
 *   npx hardhat run scripts/deploy-mainnet.js --network mainnet
 *
 * !! Set MULTISIG and TRUSTED_SIGNER before running !!
 *
 * Post-deployment checklist:
 *   □ Verify both contracts on Etherscan (commands printed below)
 *   □ Set rwa-id.eth resolver → deployed resolver address
 *   □ Update CCIP-Read gateway → REGISTRY_ADDRESS env var
 *   □ Call batchReserveNamespaces() for top RWA platform slugs
 *   □ Transfer Ownable ownership to Safe multisig if deployer ≠ multisig
 */

const { ethers } = require("hardhat");

// ── MAINNET CONFIG — fill in before deploying ──────────────────────────────
const USDC_MAINNET = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// Your Safe multisig address — will own RWAIDv2 and the Resolver
const MULTISIG = process.env.MULTISIG_ADDRESS || "";

// The gateway server's signing address — used to verify CCIP-Read responses
const TRUSTED_SIGNER = process.env.GATEWAY_SIGNER_ADDRESS || "";

// Primary gateway URL (ENSIP-10 template)
const GATEWAY_URL = "https://gateway.rwa-id.com/{sender}/{data}.json";

// Optional backup gateway for redundancy (comment out if not ready)
const BACKUP_URL = "";   // e.g. "https://gateway-backup.rwa-id.com/{sender}/{data}.json"
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!MULTISIG || !TRUSTED_SIGNER) {
    throw new Error(
      "\n❌  Set MULTISIG_ADDRESS and GATEWAY_SIGNER_ADDRESS environment variables before deploying to mainnet.\n" +
      "    export MULTISIG_ADDRESS=0x...\n" +
      "    export GATEWAY_SIGNER_ADDRESS=0x..."
    );
  }

  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();

  console.log("═══════════════════════════════════════");
  console.log("  RWA ID v2 — Mainnet Deployment");
  console.log("═══════════════════════════════════════");
  console.log("Deployer :", deployerAddr);
  console.log(
    "Balance  :",
    ethers.formatEther(await deployer.provider.getBalance(deployerAddr)),
    "ETH"
  );
  console.log("Multisig :", MULTISIG);
  console.log("Signer   :", TRUSTED_SIGNER);
  console.log("USDC     :", USDC_MAINNET);

  // Build gateway URL list
  const urls = BACKUP_URL ? [GATEWAY_URL, BACKUP_URL] : [GATEWAY_URL];

  // ── 1. RWAIDv2 ──────────────────────────────────────────────────────────────
  console.log("\n[1/2] Deploying RWAIDv2...");
  const RWAIDv2 = await ethers.getContractFactory("RWAIDv2");
  const registry = await RWAIDv2.deploy(USDC_MAINNET, MULTISIG);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("      RWAIDv2 :", registryAddr);

  // ── 2. RwaIdWildcardResolverV2 ───────────────────────────────────────────────
  console.log("\n[2/2] Deploying RwaIdWildcardResolverV2...");
  const Resolver = await ethers.getContractFactory("RwaIdWildcardResolverV2");
  const resolver = await Resolver.deploy(MULTISIG, TRUSTED_SIGNER, urls);
  await resolver.waitForDeployment();
  const resolverAddr = await resolver.getAddress();
  console.log("      Resolver:", resolverAddr);

  // ── Sanity reads ─────────────────────────────────────────────────────────────
  console.log("\n── Verification reads ──");
  console.log("  registry.owner()           :", await registry.owner());
  console.log("  registry.protocolTreasury():", await registry.protocolTreasury());
  console.log("  registry.minimumClaimFee() :", (await registry.minimumClaimFee()).toString(), "(500000 = $0.50)");
  console.log("  registry.protocolFeePercent:", (await registry.protocolFeePercent()).toString(), "%");
  console.log("  resolver.owner()           :", await resolver.owner());
  console.log("  resolver.trustedSigner()   :", await resolver.trustedSigner());
  console.log("  resolver.getUrls()         :", await resolver.getUrls());

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════");
  console.log("  Deployment Summary (Mainnet)");
  console.log("═══════════════════════════════════════");
  console.log("  USDC (real) :", USDC_MAINNET);
  console.log("  RWAIDv2     :", registryAddr);
  console.log("  Resolver    :", resolverAddr);

  console.log("\n── Verify commands ──");
  console.log(
    `npx hardhat verify --network mainnet ${registryAddr} ${USDC_MAINNET} ${MULTISIG}`
  );
  const urlsJson = JSON.stringify(urls).replace(/"/g, '\\"');
  console.log(
    `npx hardhat verify --network mainnet ${resolverAddr} ${MULTISIG} ${TRUSTED_SIGNER} "${urlsJson}"`
  );

  console.log("\n── Post-deployment checklist ──");
  console.log("□ 1. Verify contracts on Etherscan (commands above)");
  console.log("□ 2. Set rwa-id.eth resolver on ENS app → ", resolverAddr);
  console.log("□ 3. Update gateway env: REGISTRY_ADDRESS=" + registryAddr);
  console.log("□ 4. Pre-reserve top RWA slugs:");
  console.log(
    "     registry.batchReserveNamespaces(",
    '["securitize","ondo","centrifuge","maple","goldfinch","backed","realio","polymesh"],',
    "[addr, addr, ...], 30 * 24 * 3600)"
  );
  console.log("□ 5. Confirm contract owner is multisig:", MULTISIG);
  console.log("□ 6. Deploy CCIP-Read gateway at gateway.rwa-id.com");
  console.log("□ 7. Test resolution: alice.demo.rwa-id.eth → address");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
