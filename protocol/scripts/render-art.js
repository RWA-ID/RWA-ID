/**
 * render-art.js — mint names on a local chain and write the registry's own
 * tokenURI artwork to PNGs, to check the on-chain SVG by eye.
 *
 *   OUT=/tmp/art npx hardhat run scripts/render-art.js
 */
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const CASES = [
  ["joe", "acme"],
  ["treasury", "robinhood-chain"],
  ["a".repeat(63), "x".repeat(32)],
];

async function main() {
  const out = process.env.OUT || "art";
  fs.mkdirSync(out, { recursive: true });
  const [owner, ...users] = await ethers.getSigners();
  const usdg = await (await ethers.getContractFactory("MockUSDC")).deploy();
  const reg = await (await ethers.getContractFactory("RWAIDv4")).deploy(await usdg.getAddress(), owner.address);

  for (const [i, [label, slug]] of CASES.entries()) {
    const user = users[i];
    await (await reg.createProject(slug, owner.address, 0, false)).wait();
    const pid = await reg.projectIdBySlugHash(ethers.keccak256(ethers.toUtf8Bytes(slug)));
    const leaf = ethers.keccak256(ethers.solidityPacked(["address", "bytes32"], [user.address, ethers.keccak256(ethers.toUtf8Bytes(label))]));
    await (await reg.updateMerkleRoot(pid, leaf, 1)).wait();
    await (await usdg.mint(user.address, 10_000_000n)).wait();
    await (await usdg.connect(user).approve(await reg.getAddress(), 10_000_000n)).wait();
    await (await reg.connect(user).claim(pid, label, [])).wait();
    const tokenId = await reg.nextTokenId() - 1n;
    const meta = JSON.parse(Buffer.from((await reg.tokenURI(tokenId)).split(",")[1], "base64").toString());
    const svg = Buffer.from(meta.image.split(",")[1], "base64").toString();
    fs.writeFileSync(path.join(out, `${i}.svg`), svg);
    console.log(`${meta.name}  →  ${out}/${i}.svg  (${svg.length} bytes, external_url ${meta.external_url})`);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
