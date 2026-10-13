const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { PLACEHOLDER, DISCLAIMER, RESERVED, SLUGS } = require("../config/reserved-namespaces");

const LOGOS = path.join(__dirname, "../../apps/dashboard/public/reserved");

describe("Reserved namespaces config", function () {
  it("has no duplicate slugs", function () {
    expect(new Set(SLUGS).size).to.equal(SLUGS.length);
  });

  it("gives every slug a company, a domain and a logo file that exists", function () {
    for (const r of RESERVED) {
      expect(r.company, r.slug).to.be.a("string").and.not.empty;
      expect(r.domain, r.slug).to.match(/^[a-z0-9.-]+\.[a-z]+$/);
      expect(fs.existsSync(path.join(LOGOS, r.logo)), `${r.slug}: ${r.logo} missing`).to.equal(true);
    }
  });

  it("ships no logo the config does not reference", function () {
    const used = new Set(RESERVED.map((r) => r.logo));
    for (const f of fs.readdirSync(LOGOS)) expect(used.has(f), `${f} is unreferenced`).to.equal(true);
  });

  it("carries the non-affiliation disclaimer", function () {
    expect(DISCLAIMER).to.include("does not mean the company is affiliated");
    expect(DISCLAIMER).to.include("trademarks of their respective owners");
  });

  it("is accepted whole by RWAIDv4 in one batch, as deploy-v4.js sends it", async function () {
    const [owner] = await ethers.getSigners();
    const usdg = await (await ethers.getContractFactory("MockUSDC")).deploy();
    const registry = await (await ethers.getContractFactory("RWAIDv4")).deploy(await usdg.getAddress(), owner.address);
    await registry.batchReserveNamespaces(SLUGS, SLUGS.map(() => PLACEHOLDER), 94608000n);
    for (const slug of SLUGS) {
      expect(await registry.reservedTo(ethers.keccak256(ethers.toUtf8Bytes(slug))), slug).to.equal(PLACEHOLDER);
    }
  });
});
