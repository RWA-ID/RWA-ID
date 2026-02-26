/**
 * deploy-sepolia.js
 *
 * Deploys RWA ID v2 on Ethereum Sepolia testnet:
 *   1. MockUSDC (test stablecoin with public mint)
 *   2. RWAIDv2  (core registry)
 *   3. RwaIdWildcardResolverV2 (CCIP-Read resolver with gateway.rwa-id.com)
 *
 * Usage:
 *   npx hardhat run scripts/deploy-sepolia.js --network sepolia
 *
 * After deployment:
 *   - Set rwa-id.eth resolver to the deployed RwaIdWildcardResolverV2 address
 *   - Update CCIP-Read gateway to point at the new RWAIDv2 registry address
 *   - Mint test USDC to wallets via MockUSDC.mint()
 *   - Verify contracts: npx hardhat verify --network sepolia <address> <args...>
 */

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();

  console.log("═══════════════════════════════════════");
  console.log("  RWA ID v2 — Sepolia Deployment");
  console.log("═══════════════════════════════════════");
  console.log("Deployer :", deployerAddr);
  console.log(
    "Balance  :",
    ethers.formatEther(await deployer.provider.getBalance(deployerAddr)),
    "ETH"
  );

  // ── Config ──────────────────────────────────────────────────────────────────
  // On Sepolia the deployer acts as multisig. Replace before handing to a Safe.
  const MULTISIG       = deployerAddr;
  const TRUSTED_SIGNER = deployerAddr;   // Replace with actual gateway signing key
  const GATEWAY_URL    = "https://gateway.rwa-id.com/{sender}/{data}.json";
  // ────────────────────────────────────────────────────────────────────────────

  // ── 1. MockUSDC ─────────────────────────────────────────────────────────────
  console.log("\n[1/3] Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUsdc = await MockUSDC.deploy();
  await mockUsdc.waitForDeployment();
  const usdcAddr = await mockUsdc.getAddress();
  console.log("      MockUSDC :", usdcAddr);

  // ── 2. RWAIDv2 ──────────────────────────────────────────────────────────────
  console.log("\n[2/3] Deploying RWAIDv2...");
  const RWAIDv2 = await ethers.getContractFactory("RWAIDv2");
  const registry = await RWAIDv2.deploy(usdcAddr, MULTISIG);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("      RWAIDv2  :", registryAddr);

  // ── 3. RwaIdWildcardResolverV2 ───────────────────────────────────────────────
  console.log("\n[3/3] Deploying RwaIdWildcardResolverV2...");
  const Resolver = await ethers.getContractFactory("RwaIdWildcardResolverV2");
  const resolver = await Resolver.deploy(MULTISIG, TRUSTED_SIGNER, [GATEWAY_URL]);
  await resolver.waitForDeployment();
  const resolverAddr = await resolver.getAddress();
  console.log("      Resolver :", resolverAddr);

  // ── Sanity reads ─────────────────────────────────────────────────────────────
  console.log("\n── Verification reads ──");
  console.log("  registry.owner()           :", await registry.owner());
  console.log("  registry.protocolTreasury():", await registry.protocolTreasury());
  console.log("  registry.minimumClaimFee() :", (await registry.minimumClaimFee()).toString(), "(USDC units)");
  console.log("  registry.protocolFeePercent:", (await registry.protocolFeePercent()).toString(), "%");
  console.log("  resolver.trustedSigner()   :", await resolver.trustedSigner());
  console.log("  resolver.getUrls()[0]      :", (await resolver.getUrls())[0]);

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════");
  console.log("  Deployment Summary (Sepolia)");
  console.log("═══════════════════════════════════════");
  console.log("  MockUSDC  :", usdcAddr);
  console.log("  RWAIDv2   :", registryAddr);
  console.log("  Resolver  :", resolverAddr);

  console.log("\n── Verify commands ──");
  console.log(`npx hardhat verify --network sepolia ${usdcAddr}`);
  console.log(`npx hardhat verify --network sepolia ${registryAddr} ${usdcAddr} ${MULTISIG}`);
  console.log(`npx hardhat verify --network sepolia ${resolverAddr} ${MULTISIG} ${TRUSTED_SIGNER} '["${GATEWAY_URL}"]'`);

  console.log("\n── Next steps ──");
  console.log("1. Point rwa-id.eth resolver → ", resolverAddr);
  console.log("2. Update gateway env:  REGISTRY_ADDRESS=" + registryAddr);
  console.log("3. Mint test USDC:  MockUSDC.mint(<wallet>, 10_000_000) // $10");
  console.log("4. Create test project: registry.createProject('demo', treasury, 500000, false)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
