/**
 * deploy-records.js — deploy RWAIDRecords on Robinhood Chain.
 *
 *   npx hardhat run scripts/deploy-records.js --network robinhood
 *
 * Ownerless: the only constructor argument is the registry whose holders may
 * write records. Prints the address the gateway needs as RECORDS_ADDRESS.
 */
const { ethers, network } = require("hardhat");
const { RWAIDv4 } = require("../deployments/robinhood.json");

async function main() {
  if (network.name === "robinhood" && (await ethers.provider.getNetwork()).chainId !== 4663n) throw new Error("Not chain 4663");
  const records = await (await ethers.getContractFactory("RWAIDRecords")).deploy(RWAIDv4.address);
  const r = await records.deploymentTransaction().wait();
  const address = await records.getAddress();
  if ((await records.registry()) !== RWAIDv4.address) throw new Error("Registry not set");
  console.log(`RWAIDRecords ${address} (block ${r.blockNumber}) → registry ${RWAIDv4.address}`);
  console.log(`Verify: npx hardhat verify --network robinhood ${address} ${RWAIDv4.address}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
