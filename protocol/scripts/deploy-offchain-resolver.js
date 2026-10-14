/**
 * deploy-offchain-resolver.js — deploy RwaIdOffchainResolver on Ethereum mainnet.
 *
 *   RESOLVER_SIGNER=0x… RWAID_SAFE=0x… npx hardhat run scripts/deploy-offchain-resolver.js --network mainnet
 *
 * Deploys with the deployer as owner, then starts the two-step handover to the
 * Safe (the Safe must call acceptOwnership). Does NOT touch rwa-id.eth: pointing
 * the name at the new resolver is a separate, deliberate step, done only after
 * the gateway answers for this resolver (check /health and a live lookup first).
 */
const { ethers, network } = require("hardhat");

const GATEWAY_URL = "https://gateway.rwa-id.com/{sender}/{data}.json";

async function main() {
  const signer = process.env.RESOLVER_SIGNER;
  const safe = process.env.RWAID_SAFE;
  if (!ethers.isAddress(signer) || !ethers.isAddress(safe)) throw new Error("Set RESOLVER_SIGNER and RWAID_SAFE");
  if (network.name === "mainnet" && (await ethers.provider.getNetwork()).chainId !== 1n) throw new Error("Not mainnet");

  const [deployer] = await ethers.getSigners();
  const resolver = await (await ethers.getContractFactory("RwaIdOffchainResolver")).deploy([GATEWAY_URL], [signer], deployer.address);
  const r = await resolver.deploymentTransaction().wait();
  const address = await resolver.getAddress();
  await (await resolver.transferOwnership(safe)).wait();

  if (!(await resolver.signers(signer))) throw new Error("Signer not trusted");
  if ((await resolver.pendingOwner()) !== ethers.getAddress(safe)) throw new Error("Handover not started");
  console.log(`RwaIdOffchainResolver ${address} (block ${r.blockNumber})`);
  console.log(`  url     ${(await resolver.urls())[0]}`);
  console.log(`  signer  ${signer}`);
  console.log(`  owner   ${deployer.address} → pending ${safe} (Safe must acceptOwnership)`);
  console.log(`Verify: npx hardhat verify --network mainnet ${address} '["${GATEWAY_URL}"]' '["${signer}"]' ${deployer.address}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
