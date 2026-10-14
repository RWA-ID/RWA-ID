const { expect } = require("chai");
const { ethers } = require("hardhat");

// v4.1: the default artwork is the relaunch identity card, and metadata links
// point at rwa-id.com. A project's own image still replaces the card.
describe("RWAIDv4 default artwork", function () {
  let reg, usdg, owner, user;

  async function mint(label, slug) {
    await (await reg.createProject(slug, owner.address, 0, false)).wait();
    const pid = await reg.projectIdBySlugHash(ethers.keccak256(ethers.toUtf8Bytes(slug)));
    const leaf = ethers.keccak256(ethers.solidityPacked(["address", "bytes32"], [user.address, ethers.keccak256(ethers.toUtf8Bytes(label))]));
    await (await reg.updateMerkleRoot(pid, leaf, 1)).wait();
    await (await reg.connect(user).claim(pid, label, [])).wait();
    return { pid, tokenId: (await reg.nextTokenId()) - 1n };
  }

  const meta = async (id) => JSON.parse(Buffer.from((await reg.tokenURI(id)).split(",")[1], "base64").toString());
  const svgOf = (m) => Buffer.from(m.image.split(",")[1], "base64").toString();

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    usdg = await (await ethers.getContractFactory("MockUSDC")).deploy();
    reg = await (await ethers.getContractFactory("RWAIDv4")).deploy(await usdg.getAddress(), owner.address);
    await usdg.mint(user.address, 100_000_000n);
    await usdg.connect(user).approve(await reg.getAddress(), 100_000_000n);
  });

  it("draws the identity card: label in white, namespace in lime, lime bar", async function () {
    const { tokenId } = await mint("joe", "acme");
    const svg = svgOf(await meta(tokenId));
    expect(svg).to.include('fill="#FFF">joe</text>');
    expect(svg).to.include('fill="#CCFF00">.acme.rwa-id.eth</text>');
    expect(svg).to.include('<rect y="776" width="800" height="24" fill="#CCFF00"/>');
    expect(svg).to.not.include("#1D4ED8"); // the v3/v4.0 blue R card
  });

  it("shrinks long lines so a 63-character label fits", async function () {
    const { tokenId } = await mint("a".repeat(63), "x".repeat(32));
    const svg = svgOf(await meta(tokenId));
    expect(svg).to.match(/font-size="18" fill="#FFF">a{63}</);
    expect(svg).to.match(/font-size="18" fill="#CCFF00">\.x{32}\.rwa-id\.eth</);
  });

  it("links metadata to rwa-id.com", async function () {
    const { tokenId } = await mint("joe", "acme");
    expect((await meta(tokenId)).external_url).to.equal("https://rwa-id.com");
    const c = JSON.parse(Buffer.from((await reg.contractURI()).split(",")[1], "base64").toString());
    expect(c.external_link).to.equal("https://rwa-id.com");
    expect(Buffer.from(c.image.split(",")[1], "base64").toString()).to.include('fill="#CCFF00">.eth</text>');
  });

  it("still lets a platform's own image replace the card", async function () {
    const { pid, tokenId } = await mint("joe", "acme");
    await reg.setProjectImage(pid, "ipfs://bafyart");
    expect((await meta(tokenId)).image).to.equal("ipfs://bafyart");
  });
});
