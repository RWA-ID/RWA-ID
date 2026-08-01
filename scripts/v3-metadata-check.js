// Verifies RWAIDv3 against the REAL project2 proof set already pinned for v2:
// same root, same proofs, but now the mint is named and renders artwork.
const { ethers } = require("hardhat");
const fs = require("fs");

const PROOF_CID = "bafkreihpm4mlszdhyqjwprwxgecajosqk6bxvavcbnlsp4mvi3anfyoh4e";

async function main() {
  const proofSet = await (await fetch(`https://gateway.pinata.cloud/ipfs/${PROOF_CID}`)).json();
  console.log(`proof set: ${proofSet.projectSlug} · ${proofSet.totalEntries} entries`);
  console.log(`root      : ${proofSet.merkleRoot}\n`);

  const [deployer] = await ethers.getSigners();
  const usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
  const rwa  = await (await ethers.getContractFactory("RWAIDv3")).deploy(usdc.target, deployer.address);

  // Project owner creates the namespace, then publishes the v2-era root verbatim.
  await (await rwa.createProject("project2", deployer.address, 1_000_000n, false)).wait();
  await (await rwa.updateMerkleRoot(1n, proofSet.merkleRoot, proofSet.totalEntries)).wait();
  console.log("published the v2 root onto v3 unchanged ✓\n");

  // One claim per wallet per project, and this test list reuses wallets — take
  // the first entry for each distinct wallet.
  const seen = new Set();
  const sample = proofSet.entries
    .filter(e => /^[a-z0-9_-]+$/.test(e.name))   // v3 only accepts lowercase labels
    .filter(e => !seen.has(e.wallet) && seen.add(e.wallet));
  console.log(`claimable under v3's lowercase rule: ${sample.map(e => e.name).join(", ")}\n`);

  const results = [];
  for (const entry of sample) {
    await ethers.provider.send("hardhat_impersonateAccount", [entry.wallet]);
    await ethers.provider.send("hardhat_setBalance", [entry.wallet, "0x56BC75E2D63100000"]);
    const claimer = await ethers.getSigner(entry.wallet);

    await (await usdc.mint(entry.wallet, 10_000_000n)).wait();
    await (await usdc.connect(claimer).approve(rwa.target, 10_000_000n)).wait();

    // The proof is the one generated for v2 — untouched.
    await (await rwa.connect(claimer).claim(1n, entry.name, entry.proof)).wait();

    const tokenId = await rwa.nodeToTokenId(await rwa.nameNodeFromHash(1n, entry.nameHash));
    const uri  = await rwa.tokenURI(tokenId);
    const meta = JSON.parse(Buffer.from(uri.split("base64,")[1], "base64").toString());
    console.log(`claimed "${entry.name}" → token #${tokenId}`);
    console.log(`   name : ${meta.name}`);
    console.log(`   full : ${await rwa.fullName(tokenId)}`);
    console.log(`   image: ${meta.image.slice(0, 42)}… (${meta.image.length} chars)`);
    console.log(`   traits: ${meta.attributes.map(a => `${a.trait_type}=${a.value}`).join(", ")}`);
    results.push({ entry, meta });
  }

  // Write the first card out so the artwork can be eyeballed.
  const svg = Buffer.from(results[0].meta.image.split("base64,")[1], "base64").toString();
  fs.writeFileSync("/tmp/rwaid-token.svg", svg);
  const collection = JSON.parse(Buffer.from((await rwa.contractURI()).split("base64,")[1], "base64").toString());
  fs.writeFileSync("/tmp/rwaid-collection.svg",
    Buffer.from(collection.image.split("base64,")[1], "base64").toString());
  console.log(`\ncollection: ${collection.name} — ${collection.description.slice(0, 60)}…`);

  // Negative cases
  const bad = { ...proofSet.entries.find(e => e.wallet === sample.at(-1).wallet) };
  bad.wallet = ethers.getAddress("0x00000000000000000000000000000000000000ff");
  await ethers.provider.send("hardhat_impersonateAccount", [bad.wallet]);
  await ethers.provider.send("hardhat_setBalance", [bad.wallet, "0x56BC75E2D63100000"]);
  const badSigner = await ethers.getSigner(bad.wallet);
  await (await usdc.mint(bad.wallet, 10_000_000n)).wait();
  await (await usdc.connect(badSigner).approve(rwa.target, 10_000_000n)).wait();

  const cases = [
    ["not.allowed", "dots rejected"],
    ["", "empty rejected"],
    ['a","name":"forged', "JSON injection rejected"],
    ["a<script>x</script>", "SVG injection rejected"],
    ["a&amp;b", "entity injection rejected"],
    ["a b", "spaces rejected"],
    ["Zac", "uppercase rejected — this is the v2 bug that broke ENS resolution"],
    ["mallory", "wrong label for this wallet"],
  ];
  for (const [label, why] of cases) {
    try {
      await rwa.connect(badSigner).claim.staticCall(1n, label, bad.proof);
      console.log(`❌ "${label}" was accepted — expected: ${why}`);
    } catch (e) {
      console.log(`✓ "${label}" rejected (${why}): ${(e.reason || e.shortMessage || "").slice(0, 40)}`);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
