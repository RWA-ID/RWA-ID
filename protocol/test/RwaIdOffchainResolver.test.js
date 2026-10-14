const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const URL = "https://gateway.rwa-id.com/{sender}/{data}.json";

// DNS wire format, as ENS clients pass `name` to resolve().
const dnsEncode = (name) =>
  ethers.concat([...name.split(".").map((l) => ethers.concat([new Uint8Array([l.length]), ethers.toUtf8Bytes(l)])), "0x00"]);

describe("RwaIdOffchainResolver", function () {
  let resolver, owner, safe, stranger, signer, rogue;
  const iface = new ethers.Interface([
    "function addr(bytes32) view returns (address)",
    "function resolve(bytes name, bytes data) view returns (bytes, uint64, bytes)",
  ]);

  beforeEach(async function () {
    [owner, safe, stranger] = await ethers.getSigners();
    signer = ethers.Wallet.createRandom();
    rogue = ethers.Wallet.createRandom();
    resolver = await (await ethers.getContractFactory("RwaIdOffchainResolver")).deploy([URL], [signer.address], owner.address);
  });

  // What the gateway does: sign the 0x1900 digest raw, return (result, expires, sig).
  async function answer({ key = signer, result, request, expires }) {
    const target = await resolver.getAddress();
    const digest = await resolver.makeSignatureHash(target, expires, request, result);
    const sig = ethers.Signature.from(key.signingKey.sign(digest)).serialized;
    return ethers.AbiCoder.defaultAbiCoder().encode(["bytes", "uint64", "bytes"], [result, expires, sig]);
  }

  async function lookup(name) {
    const data = iface.encodeFunctionData("addr", [ethers.namehash(name)]);
    try {
      await resolver.resolve(dnsEncode(name), data);
    } catch (e) {
      const parsed = resolver.interface.parseError(e.data);
      expect(parsed.name).to.equal("OffchainLookup");
      return { args: parsed.args, data };
    }
    throw new Error("resolve did not revert with OffchainLookup");
  }

  it("defers every name to the gateway with a resolve(name, data) request", async function () {
    const { args, data } = await lookup("joe.acme.rwa-id.eth");
    expect(args.sender).to.equal(await resolver.getAddress());
    expect([...args.urls]).to.deep.equal([URL]);
    expect(args.callbackFunction).to.equal(resolver.interface.getFunction("resolveWithProof").selector);
    expect(args.extraData).to.equal(args.callData);
    const [name, inner] = iface.decodeFunctionData("resolve", args.callData);
    expect(name).to.equal(ethers.hexlify(dnsEncode("joe.acme.rwa-id.eth")));
    expect(inner).to.equal(data);
  });

  it("returns a correctly signed answer", async function () {
    const { args } = await lookup("joe.acme.rwa-id.eth");
    const result = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [stranger.address]);
    const expires = (await time.latest()) + 300;
    const response = await answer({ result, request: args.extraData, expires });
    expect(await resolver.resolveWithProof(response, args.extraData)).to.equal(result);
  });

  it("rejects an answer whose result was altered after signing", async function () {
    const { args } = await lookup("joe.acme.rwa-id.eth");
    const expires = (await time.latest()) + 300;
    const signed = await answer({ result: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [stranger.address]), request: args.extraData, expires });
    const [, , sig] = ethers.AbiCoder.defaultAbiCoder().decode(["bytes", "uint64", "bytes"], signed);
    const forged = ethers.AbiCoder.defaultAbiCoder().encode(["bytes", "uint64", "bytes"],
      [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [owner.address]), expires, sig]);
    await expect(resolver.resolveWithProof(forged, args.extraData)).to.be.revertedWith("Invalid signer");
  });

  it("rejects a valid answer replayed for a different name (the V2 weakness)", async function () {
    const a = await lookup("joe.acme.rwa-id.eth");
    const b = await lookup("ana.acme.rwa-id.eth");
    const expires = (await time.latest()) + 300;
    const response = await answer({ result: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [stranger.address]), request: a.args.extraData, expires });
    await expect(resolver.resolveWithProof(response, b.args.extraData)).to.be.revertedWith("Invalid signer");
  });

  it("rejects an answer signed for another resolver", async function () {
    const other = await (await ethers.getContractFactory("RwaIdOffchainResolver")).deploy([URL], [signer.address], owner.address);
    const { args } = await lookup("joe.acme.rwa-id.eth");
    const expires = (await time.latest()) + 300;
    const result = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [stranger.address]);
    const digest = await other.makeSignatureHash(await other.getAddress(), expires, args.extraData, result);
    const sig = ethers.Signature.from(signer.signingKey.sign(digest)).serialized;
    const response = ethers.AbiCoder.defaultAbiCoder().encode(["bytes", "uint64", "bytes"], [result, expires, sig]);
    await expect(resolver.resolveWithProof(response, args.extraData)).to.be.revertedWith("Invalid signer");
  });

  it("rejects untrusted signers, expired answers and over-long expiries", async function () {
    const { args } = await lookup("joe.acme.rwa-id.eth");
    const result = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [stranger.address]);
    const now = await time.latest();
    await expect(resolver.resolveWithProof(await answer({ key: rogue, result, request: args.extraData, expires: now + 300 }), args.extraData))
      .to.be.revertedWith("Invalid signer");
    await expect(resolver.resolveWithProof(await answer({ result, request: args.extraData, expires: now - 1 }), args.extraData))
      .to.be.revertedWith("Signature expired");
    await expect(resolver.resolveWithProof(await answer({ result, request: args.extraData, expires: now + 3601 + 5 }), args.extraData))
      .to.be.revertedWith("Expiry too far");
  });

  it("lets only the owner manage signers and urls, with two-step ownership", async function () {
    await expect(resolver.connect(stranger).setSigner(rogue.address, true)).to.be.revertedWithCustomError(resolver, "OwnableUnauthorizedAccount");
    await expect(resolver.connect(stranger).setUrls(["x"])).to.be.revertedWithCustomError(resolver, "OwnableUnauthorizedAccount");
    await resolver.setSigner(signer.address, false);
    expect(await resolver.signers(signer.address)).to.equal(false);
    await resolver.setUrls(["https://b/{sender}/{data}.json"]);
    expect([...(await resolver.urls())]).to.deep.equal(["https://b/{sender}/{data}.json"]);

    await resolver.transferOwnership(safe.address);
    expect(await resolver.owner()).to.equal(owner.address);
    await resolver.connect(safe).acceptOwnership();
    expect(await resolver.owner()).to.equal(safe.address);
  });

  it("advertises ENSIP-10 (extended resolver) and ERC-165", async function () {
    expect(await resolver.supportsInterface("0x9061b923")).to.equal(true);
    expect(await resolver.supportsInterface("0x01ffc9a7")).to.equal(true);
    expect(await resolver.supportsInterface("0x3b3b57de")).to.equal(false);
  });
});
