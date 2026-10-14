const { expect } = require("chai");
const { ethers } = require("hardhat");

const BTC = 0n;
const SOL = 501n;
const BASE = 0x80000000n | 8453n; // ENSIP-11 coin type for Base
const ETH = 60n;

describe("RWAIDRecords", function () {
  let reg, rec, usdg, owner, alice, bob, mallory;
  let pid, node, tokenId;

  const leaf = (addr, label) =>
    ethers.keccak256(ethers.solidityPacked(["address", "bytes32"], [addr, ethers.keccak256(ethers.toUtf8Bytes(label))]));

  beforeEach(async function () {
    [owner, alice, bob, mallory] = await ethers.getSigners();
    usdg = await (await ethers.getContractFactory("MockUSDC")).deploy();
    reg = await (await ethers.getContractFactory("RWAIDv4")).deploy(await usdg.getAddress(), owner.address);
    rec = await (await ethers.getContractFactory("RWAIDRecords")).deploy(await reg.getAddress());

    await reg.createProject("acme", owner.address, 0, true); // transferable, to test hand-overs
    pid = await reg.projectIdBySlugHash(ethers.keccak256(ethers.toUtf8Bytes("acme")));
    await reg.updateMerkleRoot(pid, leaf(alice.address, "joe"), 1);
    await usdg.mint(alice.address, 10_000_000n);
    await usdg.connect(alice).approve(await reg.getAddress(), 10_000_000n);
    await reg.connect(alice).claim(pid, "joe", []);
    tokenId = (await reg.nextTokenId()) - 1n;
    node = await reg.nameNodeFromHash(pid, ethers.keccak256(ethers.toUtf8Bytes("joe")));
  });

  it("node is the ENS namehash of the full name", async function () {
    expect(node).to.equal(ethers.namehash("joe.acme.rwa-id.eth"));
  });

  it("serves the holder as the ETH address, and it cannot be overridden", async function () {
    expect(await rec.addr(node, ETH)).to.equal(alice.address.toLowerCase());
    await expect(rec.connect(alice).setAddr(node, ETH, bob.address)).to.be.revertedWithCustomError(rec, "EthAddressIsTheHolder");
  });

  it("lets only the current holder write", async function () {
    await expect(rec.connect(mallory).setAddr(node, BTC, "0x0014aa")).to.be.revertedWithCustomError(rec, "NotHolder");
    await expect(rec.connect(owner).setText(node, "url", "https://x")).to.be.revertedWithCustomError(rec, "NotHolder");
    const unclaimed = await reg.nameNodeFromHash(pid, ethers.keccak256(ethers.toUtf8Bytes("nobody")));
    await expect(rec.connect(alice).setAddr(unclaimed, BTC, "0x01")).to.be.revertedWithCustomError(rec, "NotHolder");
  });

  it("stores addresses per coin type and text records, and clears them with empty values", async function () {
    const sol = ethers.hexlify(ethers.randomBytes(32));
    await rec.connect(alice).setRecords(node, [BTC, SOL, BASE], ["0x0014abcd", sol, bob.address], ["url", "com.twitter"], ["https://acme.example", "joe"]);
    expect(await rec.addr(node, BTC)).to.equal("0x0014abcd");
    expect(await rec.addr(node, SOL)).to.equal(sol);
    expect(await rec.addr(node, BASE)).to.equal(bob.address.toLowerCase());
    expect(await rec.text(node, "url")).to.equal("https://acme.example");
    expect(await rec.text(node, "com.twitter")).to.equal("joe");

    await rec.connect(alice).setAddr(node, BTC, "0x");
    await rec.connect(alice).setText(node, "url", "");
    expect(await rec.addr(node, BTC)).to.equal("0x");
    expect(await rec.text(node, "url")).to.equal("");
  });

  it("drops the previous holder's records the moment the name changes hands", async function () {
    await rec.connect(alice).setAddr(node, BTC, "0x0014aa");
    await rec.connect(alice).setText(node, "url", "https://alice");
    await reg.connect(alice).transferFrom(alice.address, bob.address, tokenId);

    expect(await rec.addr(node, ETH)).to.equal(bob.address.toLowerCase());
    expect(await rec.addr(node, BTC)).to.equal("0x");
    expect(await rec.text(node, "url")).to.equal("");
    expect(await rec.addrOf(node, alice.address, BTC)).to.equal("0x0014aa"); // history kept, not served
    await expect(rec.connect(alice).setAddr(node, BTC, "0x01")).to.be.revertedWithCustomError(rec, "NotHolder");
    await rec.connect(bob).setAddr(node, BTC, "0x0014bb");
    expect(await rec.addr(node, BTC)).to.equal("0x0014bb");
  });

  it("serves nothing for a revoked name", async function () {
    await rec.connect(alice).setAddr(node, BTC, "0x0014aa");
    await reg.revokeIdentity(pid, tokenId);
    expect(await rec.addr(node, ETH)).to.equal("0x");
    expect(await rec.addr(node, BTC)).to.equal("0x");
    expect(await rec.text(node, "url")).to.equal("");
  });

  it("enforces size limits", async function () {
    await expect(rec.connect(alice).setAddr(node, BTC, ethers.hexlify(ethers.randomBytes(129)))).to.be.revertedWithCustomError(rec, "TooLong");
    await expect(rec.connect(alice).setText(node, "", "x")).to.be.revertedWithCustomError(rec, "TooLong");
    await expect(rec.connect(alice).setText(node, "k".repeat(65), "x")).to.be.revertedWithCustomError(rec, "TooLong");
    await expect(rec.connect(alice).setText(node, "url", "v".repeat(1025))).to.be.revertedWithCustomError(rec, "TooLong");
    await rec.connect(alice).setText(node, "description", "v".repeat(1024));
  });

  it("emits events naming the holder", async function () {
    await expect(rec.connect(alice).setAddr(node, BTC, "0x0014aa"))
      .to.emit(rec, "AddrChanged").withArgs(node, alice.address, BTC, "0x0014aa");
    await expect(rec.connect(alice).setText(node, "url", "https://a"))
      .to.emit(rec, "TextChanged");
  });
});
