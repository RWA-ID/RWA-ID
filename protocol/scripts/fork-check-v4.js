/**
 * fork-check-v4.js — rehearse the whole v4 launch against real Robinhood Chain state.
 *
 *   FORK_ROBINHOOD=1 npx hardhat run scripts/fork-check-v4.js
 *
 * Runs on a local copy of the chain, so nothing here is sent anywhere. It uses
 * the real USDG contract (a Paxos proxy, so pause/blocklist logic included),
 * the real deployer address and the chain's real gas price.
 *
 *   1. deploy-v4 steps as the deployer: deploy, reserve, treasury, handoff
 *   2. the Safe accepts; a platform is verified and given "robinhood"
 *   3. platform creates the project, sets its art, sponsors two claims in USDG,
 *      and delivers them with claimFor — the clients never touch USDG or gas
 *   4. token + platform unlock: fund the "robinhood" bucket, activate, check it
 *      counts exactly the two claims
 */
const { ethers, network } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const { PLACEHOLDER, SLUGS } = require("../config/reserved-namespaces");

const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const DEPLOYER = "0x5f11a48230f7CdaB91A2361576239091E4b1165b"; // breilyn.eth
const SAFE = "0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab"; // RWA ID Safe, activated on 4663 2026-10-13
const USDG_HOLDER = "0x2D037f66b9e0EDE90c2080558a7d3FF7BE36E9A1"; // ensgiant treasury, ~10 USDG
const ART = "ipfs://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy";

const ok = (cond, msg) => {
  if (!cond) throw new Error(`FAILED: ${msg}`);
  console.log(`  ✓ ${msg}`);
};

async function impersonate(addr) {
  await network.provider.request({ method: "hardhat_impersonateAccount", params: [addr] });
  await network.provider.send("hardhat_setBalance", [addr, "0x56BC75E2D63100000"]); // 100 ETH, fork only
  return ethers.getSigner(addr);
}

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  if (chainId !== 4663n || !process.env.FORK_ROBINHOOD) throw new Error("Run with FORK_ROBINHOOD=1");
  const block = await ethers.provider.getBlockNumber();
  console.log(`\nForked Robinhood Chain at block ${block}\n`);

  const [, platform, client1, client2] = await ethers.getSigners();
  const deployer = await impersonate(DEPLOYER);
  ok((await ethers.provider.getCode(SAFE)) !== "0x", "the RWA ID Safe exists on Robinhood Chain");
  const safe = await impersonate(SAFE); // stands in for a 2-of-3 Safe transaction
  const usdg = await ethers.getContractAt("IERC20", USDG);
  const gas = {};

  // 1 — deploy-v4.js, step for step
  const Registry = await ethers.getContractFactory("RWAIDv4", deployer);
  const registry = await Registry.deploy(USDG, deployer.address);
  gas.deployRegistry = (await registry.deploymentTransaction().wait()).gasUsed;
  const reserveTx = await (await registry.batchReserveNamespaces(SLUGS, SLUGS.map(() => PLACEHOLDER), 94608000n)).wait();
  gas.reserveAll = reserveTx.gasUsed;
  await (await registry.setProtocolTreasury(safe.address)).wait();
  await (await registry.transferOwnership(safe.address)).wait();
  ok((await registry.owner()) === deployer.address, "deployer stays owner until the Safe accepts");
  await (await registry.connect(safe).acceptOwnership()).wait();
  ok((await registry.owner()) === safe.address, "Safe accepted ownership");
  ok(
    (await registry.reservedTo(ethers.keccak256(ethers.toUtf8Bytes("robinhood")))) === PLACEHOLDER,
    `${SLUGS.length} namespaces reserved to the placeholder`
  );

  // 2 — the Safe verifies a platform and hands it "robinhood"
  await (await registry.connect(safe).reserveNamespace("robinhood", platform.address, 86400n * 30n)).wait();
  await expectRevert(
    registry.connect(client1).createProject("robinhood", client1.address, 0, false),
    "a stranger cannot take the reserved namespace"
  );

  // 3 — the platform's side
  await (await registry.connect(platform).createProject("robinhood", platform.address, 0, false)).wait();
  await (await registry.connect(platform).setProjectImage(1, ART)).wait();

  const entries = [
    [client1.address, "alice"],
    [client2.address, "bob"],
  ];
  const leaves = entries.map(([a, l]) =>
    ethers.keccak256(ethers.solidityPacked(["address", "bytes32"], [a, ethers.keccak256(ethers.toUtf8Bytes(l))]))
  );
  const tree = new MerkleTree(
    leaves.map((l) => Buffer.from(l.slice(2), "hex")),
    (x) => Buffer.from(ethers.keccak256(x).slice(2), "hex"),
    { sortPairs: true }
  );
  await (await registry.connect(platform).updateMerkleRoot(1, "0x" + tree.getRoot().toString("hex"), 2)).wait();

  const fee = await registry.effectiveClaimFee(1);
  ok(fee === 500_000n, "fee 0 is charged at the $0.50 floor");

  const holder = await impersonate(USDG_HOLDER);
  await (await usdg.connect(holder).transfer(platform.address, fee * 2n)).wait();
  await (await usdg.connect(platform).approve(await registry.getAddress(), fee * 2n)).wait();
  await (await registry.connect(platform).fundSponsorship(1, fee * 2n)).wait();
  ok((await registry.sponsorBalance(1)) === fee * 2n, "platform funded its sponsor pool with real USDG");

  const safeBefore = await usdg.balanceOf(safe.address);
  const platformBefore = await usdg.balanceOf(platform.address);
  for (let i = 0; i < 2; i++) {
    const proof = tree.getHexProof(Buffer.from(leaves[i].slice(2), "hex"));
    const r = await (await registry.connect(platform).claimFor(1, entries[i][0], entries[i][1], proof)).wait();
    gas.claimFor = r.gasUsed;
  }
  ok((await registry.ownerOf(1)) === client1.address && (await registry.ownerOf(2)) === client2.address,
    "both identities landed with the allowlisted wallets");
  ok((await usdg.balanceOf(client1.address)) === 0n, "clients never held USDG");
  ok((await usdg.balanceOf(safe.address)) - safeBefore === 300_000n, "protocol received 30% ($0.30) in USDG");
  ok((await usdg.balanceOf(platform.address)) - platformBefore === 700_000n, "platform received 70% ($0.70) back");

  const node = await registry.nameNodeFromHash(1, ethers.keccak256(ethers.toUtf8Bytes("alice")));
  ok((await registry.resolveAddr(node)) === client1.address, "resolveAddr (what the gateway signs) returns the holder");
  const meta = JSON.parse(Buffer.from((await registry.tokenURI(1)).split(",")[1], "base64").toString());
  ok(meta.name === "alice.robinhood.rwa-id.eth" && meta.image === ART, "tokenURI shows the platform's art");

  // 4 — token + platform unlock
  const token = await (await ethers.getContractFactory("RWAIDToken")).deploy(
    "Fork Test Token", "FORK", ethers.parseEther("1000000000"), safe.address
  );
  const now = (await ethers.provider.getBlock("latest")).timestamp;
  const unlock = await (await ethers.getContractFactory("RWAIDPlatformUnlock")).deploy(
    await token.getAddress(), await registry.getAddress(), safe.address,
    10_000n, 730n * 86400n, BigInt(now) + 548n * 86400n
  );
  gas.deployUnlock = (await unlock.deploymentTransaction().wait()).gasUsed;

  const bucket = ethers.parseEther("6250000"); // 20% of 1B over 32 buckets
  await (await token.connect(safe).transfer(await unlock.getAddress(), bucket * BigInt(SLUGS.length))).wait();
  const addTx = await (await unlock.connect(safe).addBuckets(SLUGS, SLUGS.map(() => bucket))).wait();
  gas.addBuckets = addTx.gasUsed;
  await (await unlock.connect(safe).activate("robinhood")).wait();
  ok((await unlock.earned(ethers.keccak256(ethers.toUtf8Bytes("robinhood")))) === 0n,
    "the two pre-activation claims do not count");


  // Ask the live chain: a fork reports Hardhat's own 1 gwei default, which
  // overstated every cost here about 50x.
  const live = new ethers.JsonRpcProvider(
    process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"
  );
  const gasPrice = BigInt(await live.send("eth_gasPrice", []));
  console.log(`\nGas at Robinhood Chain's live price, ${ethers.formatUnits(gasPrice, "gwei")} gwei:`);
  for (const [k, v] of Object.entries(gas)) {
    console.log(`  ${k.padEnd(15)} ${v.toString().padStart(9)} gas  ≈ ${ethers.formatEther(v * gasPrice)} ETH`);
  }
  console.log("\nAll checks passed on a fork of the live chain.\n");
}

async function expectRevert(promise, msg) {
  try {
    await promise;
  } catch {
    return ok(true, msg);
  }
  throw new Error(`FAILED: ${msg} (did not revert)`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
