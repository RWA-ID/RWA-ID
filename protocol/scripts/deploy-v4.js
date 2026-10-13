/**
 * deploy-v4.js — deploy RWAIDv4 to Robinhood Chain and hand it to the Safe.
 *
 *   RWAID_SAFE=0x… npx hardhat run scripts/deploy-v4.js                      # dry run, local chain
 *   RWAID_SAFE=0x… npx hardhat run scripts/deploy-v4.js --network robinhood  # real
 *
 * Order matters, and every step is one the deployer can do alone:
 *   1. deploy with the deployer as owner, so step 2 needs no Safe transaction;
 *   2. reserve every slug in config/reserved-namespaces.js to the placeholder;
 *   3. point protocolTreasury at the Safe — before any claim can pay the deployer;
 *   4. transferOwnership(Safe). Ownable2Step: the Safe must then call
 *      acceptOwnership(), and until it does the deployer is still the owner.
 *
 * After deploy (printed at the end): the gateway's RWA_ID_REGISTRY + RPC,
 * the dashboard's contract constant + chain, and Blockscout verification.
 */
const { ethers, network } = require("hardhat");
const { PLACEHOLDER, SLUGS } = require("../config/reserved-namespaces");

const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"; // Robinhood Chain (Paxos, 6 decimals)
const RESERVATION = 3n * 365n * 24n * 60n * 60n; // 3 years; re-reserve via the Safe before expiry

async function main() {
  const safe = process.env.RWAID_SAFE;
  if (!safe || !ethers.isAddress(safe)) throw new Error("Set RWAID_SAFE to the Robinhood Chain Safe address");
  const SAFE = ethers.getAddress(safe);

  const isLive = network.name === "robinhood";
  let paymentToken = USDG;
  if (!isLive) {
    // Dry run: a local stand-in, since USDG does not exist on an empty chain.
    const mock = await (await ethers.getContractFactory("MockUSDC")).deploy();
    paymentToken = await mock.getAddress();
  }

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log(`\nRWAIDv4 deploy — ${isLive ? "LIVE" : "dry run"} on ${network.name} (chain ${chainId})`);
  console.log(`  deployer : ${deployer.address}`);
  console.log(`  safe     : ${SAFE}`);
  console.log(`  payment  : ${paymentToken}${isLive ? " (USDG)" : " (mock)"}`);
  console.log(`  slugs    : ${SLUGS.length} → ${PLACEHOLDER}\n`);
  if (isLive && chainId !== 4663n) throw new Error(`Expected chain 4663, got ${chainId}`);
  if ((await ethers.provider.getCode(SAFE)) === "0x" && isLive) {
    throw new Error(`No contract at RWAID_SAFE ${SAFE} on this chain — create the Safe first`);
  }

  const registry = await (await ethers.getContractFactory("RWAIDv4")).deploy(paymentToken, deployer.address);
  const receipt = await registry.deploymentTransaction().wait();
  const address = await registry.getAddress();
  console.log(`  ✓ RWAIDv4 ${address} (block ${receipt.blockNumber})`);

  await (await registry.batchReserveNamespaces(SLUGS, SLUGS.map(() => PLACEHOLDER), RESERVATION)).wait();
  console.log(`  ✓ reserved ${SLUGS.length} namespaces for 3 years`);

  await (await registry.setProtocolTreasury(SAFE)).wait();
  await (await registry.transferOwnership(SAFE)).wait();

  // Read back rather than trusting the transactions.
  const treasury = await registry.protocolTreasury();
  const pending = await registry.pendingOwner();
  if (treasury !== SAFE || pending !== SAFE) throw new Error("Handoff did not stick");
  for (const slug of SLUGS) {
    const h = ethers.keccak256(ethers.toUtf8Bytes(slug));
    if ((await registry.reservedTo(h)) !== PLACEHOLDER) throw new Error(`Reservation missing: ${slug}`);
  }
  console.log(`  ✓ protocolTreasury = Safe; pendingOwner = Safe (owner stays deployer until accepted)`);

  console.log(`
Next:
  1. Safe → RWAIDv4 ${address} → acceptOwnership()
  2. Gateway: RWA_ID_REGISTRY=${address}, RPC → Robinhood Chain (4663)
  3. Dashboard: registry constant + chain 4663 + USDG ${USDG}
  4. Verify: npx hardhat verify --network robinhood ${address} ${paymentToken} ${deployer.address}
     (constructor owner is the deployer; ownership moved afterwards)
  5. Log-scan start block: ${receipt.blockNumber}
`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
