/**
 * Deploy RWAIDv3.
 *
 *   npx hardhat run scripts/deploy-v3.js                 # dry run on a fork-less local node
 *   npx hardhat run scripts/deploy-v3.js --network mainnet
 *
 * The owner is the protocol multisig, matching how v2 was deployed. Nothing in
 * ENS needs to change: RwaIdWildcardResolverV2 holds no registry address, so the
 * cutover is the gateway's RWA_ID_REGISTRY env var plus the dashboard constant.
 */
const { ethers, network } = require("hardhat");

const USDC_MAINNET = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// v2's owner — keep governance identical unless you deliberately move it.
const MULTISIG = process.env.RWA_ID_MULTISIG || "0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab";

async function main() {
  const live = network.name === "mainnet";
  const [deployer] = await ethers.getSigners();

  const usdc = live
    ? USDC_MAINNET
    : (await (await ethers.getContractFactory("MockUSDC")).deploy()).target;

  console.log(`network : ${network.name}${live ? "" : "  (dry run)"}`);
  console.log(`deployer: ${deployer.address}`);
  console.log(`balance : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log(`usdc    : ${usdc}`);
  console.log(`owner   : ${MULTISIG}\n`);

  if (live && MULTISIG === ethers.ZeroAddress) throw new Error("Refusing to deploy with a zero owner");

  const factory = await ethers.getContractFactory("RWAIDv3");

  const gas = await ethers.provider.estimateGas(await factory.getDeployTransaction(usdc, MULTISIG));
  const fee = (await ethers.provider.getFeeData()).maxFeePerGas ?? 0n;
  console.log(`estimated gas: ${gas} (~${ethers.formatEther(gas * fee)} ETH at current maxFeePerGas)\n`);

  const rwa = await factory.deploy(usdc, MULTISIG);
  await rwa.waitForDeployment();
  const address = rwa.target;
  console.log(`RWAIDv3 deployed → ${address}\n`);

  // Prove the thing that was broken in v2 is fixed before anyone relies on it.
  console.log(`name    : ${await rwa.name()} (${await rwa.symbol()})`);
  console.log(`owner   : ${await rwa.owner()}`);
  console.log(`ERC-4906: ${await rwa.supportsInterface("0x49064906")}`);
  const collection = JSON.parse(
    Buffer.from((await rwa.contractURI()).split("base64,")[1], "base64").toString(),
  );
  console.log(`contractURI renders: ${collection.name} · image ${collection.image.length} bytes\n`);

  console.log("Next steps:");
  console.log(`  1. gateway  — set RWA_ID_REGISTRY=${address} and redeploy the worker`);
  console.log(`  2. dashboard — RWAID_ADDRESS in src/lib/contracts.js, and`);
  console.log(`     CONTRACT_START_BLOCK in src/lib/readClient.js → ${await ethers.provider.getBlockNumber()}`);
  console.log(`  3. recreate the projects you want to keep (all v2 projects were tests)`);
  console.log(`  4. verify: npx hardhat verify --network mainnet ${address} ${usdc} ${MULTISIG}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
