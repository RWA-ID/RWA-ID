const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { MerkleTree } = require("merkletreejs");

const DAY = 24n * 60n * 60n;
const RELEASE = 730n * DAY; // 24 months
const FULL_AT = 100n; // claims for a full unlock (small so tests can reach it)
const BUCKET = ethers.parseEther("1000000");
const FEE = 500_000n;

function leaf(addr, label) {
  return ethers.keccak256(
    ethers.solidityPacked(["address", "bytes32"], [addr, ethers.keccak256(ethers.toUtf8Bytes(label))])
  );
}

describe("RWAIDPlatformUnlock", function () {
  let usdg, registry, token, unlock;
  let safe, ondo, newOwner, stranger, wallets;
  let deadline;

  beforeEach(async function () {
    [, safe, ondo, newOwner, stranger] = await ethers.getSigners();

    usdg = await (await ethers.getContractFactory("MockUSDC")).deploy();
    registry = await (await ethers.getContractFactory("RWAIDv4")).deploy(await usdg.getAddress(), safe.address);
    token = await (await ethers.getContractFactory("RWAIDToken")).deploy(
      "Test Token",
      "TEST",
      ethers.parseEther("1000000000"),
      safe.address
    );

    deadline = BigInt(await time.latest()) + 548n * DAY;
    unlock = await (await ethers.getContractFactory("RWAIDPlatformUnlock")).deploy(
      await token.getAddress(),
      await registry.getAddress(),
      safe.address,
      FULL_AT,
      RELEASE,
      deadline
    );

    // Funded wallets for generating real, fee-paying claims.
    wallets = [];
    for (let i = 0; i < 120; i++) {
      const w = ethers.Wallet.createRandom().connect(ethers.provider);
      wallets.push(w);
    }
  });

  async function fundAndAdd(slugs, amount = BUCKET) {
    await token.connect(safe).transfer(await unlock.getAddress(), amount * BigInt(slugs.length));
    return unlock.connect(safe).addBuckets(slugs, slugs.map(() => amount));
  }

  // The real company creates its project and sponsors its clients' claims.
  async function createProject(slug = "ondo", owner = ondo) {
    await registry.connect(safe).reserveNamespace(slug, owner.address, 365n * DAY);
    await registry.connect(owner).createProject(slug, owner.address, 0, false);
    return registry.projectIdBySlugHash(ethers.keccak256(ethers.toUtf8Bytes(slug)));
  }

  /** Make `n` real claims in `projectId`, paid from the platform's sponsor pool. */
  async function makeClaims(projectId, n, owner = ondo, offset = 0) {
    const batch = wallets.slice(offset, offset + n);
    const leaves = batch.map((w, i) => leaf(w.address, `c${offset + i}`));
    const tree = new MerkleTree(
      leaves.map((l) => Buffer.from(l.slice(2), "hex")),
      (x) => Buffer.from(ethers.keccak256(x).slice(2), "hex"),
      { sortPairs: true }
    );
    await registry.connect(owner).updateMerkleRoot(projectId, "0x" + tree.getRoot().toString("hex"), n);
    await usdg.mint(owner.address, FEE * BigInt(n));
    await usdg.connect(owner).approve(await registry.getAddress(), FEE * BigInt(n));
    await registry.connect(owner).fundSponsorship(projectId, FEE * BigInt(n));
    for (let i = 0; i < n; i++) {
      const proof = tree.getHexProof(Buffer.from(leaves[i].slice(2), "hex"));
      await registry.connect(owner).claimFor(projectId, batch[i].address, `c${offset + i}`, proof);
    }
  }

  const H = (slug) => ethers.keccak256(ethers.toUtf8Bytes(slug));

  // ─── Setup ─────────────────────────────────────────────────────────────────

  describe("Setup", function () {
    it("refuses to promise tokens it does not hold", async function () {
      await token.connect(safe).transfer(await unlock.getAddress(), BUCKET - 1n);
      await expect(unlock.connect(safe).addBuckets(["ondo"], [BUCKET])).to.be.revertedWith("Unfunded");
    });

    it("creates one bucket per slug and tracks the commitment", async function () {
      await fundAndAdd(["ondo", "securitize", "robinhood"]);
      expect(await unlock.bucketCount()).to.equal(3n);
      expect(await unlock.totalCommitted()).to.equal(BUCKET * 3n);
    });

    it("rejects a mixed-case slug, which no project could ever match", async function () {
      await token.connect(safe).transfer(await unlock.getAddress(), BUCKET);
      await expect(unlock.connect(safe).addBuckets(["Ondo"], [BUCKET])).to.be.revertedWith(
        "Slug: lowercase a-z 0-9 -"
      );
    });

    it("rejects a duplicate bucket", async function () {
      await fundAndAdd(["ondo"]);
      await token.connect(safe).transfer(await unlock.getAddress(), BUCKET);
      await expect(unlock.connect(safe).addBuckets(["ondo"], [BUCKET])).to.be.revertedWith("Bucket exists");
    });

    it("is owner-only", async function () {
      await expect(unlock.connect(stranger).addBuckets(["ondo"], [1n])).to.be.revertedWithCustomError(
        unlock,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  // ─── Activation ────────────────────────────────────────────────────────────

  describe("Activation", function () {
    beforeEach(async function () {
      await fundAndAdd(["ondo"]);
    });

    it("needs the project to exist on the registry", async function () {
      await expect(unlock.connect(safe).activate("ondo")).to.be.revertedWith("Project not created");
    });

    it("is owner-only, so a squatter on a lapsed reservation cannot start it", async function () {
      await createProject();
      await expect(unlock.connect(ondo).activate("ondo")).to.be.revertedWithCustomError(
        unlock,
        "OwnableUnauthorizedAccount"
      );
    });

    it("does not count claims made before activation", async function () {
      const pid = await createProject();
      await makeClaims(pid, 10);
      await unlock.connect(safe).activate("ondo");
      await time.increase(RELEASE);
      expect(await unlock.earned(H("ondo"))).to.equal(0n);
    });

    it("cannot happen after the deadline", async function () {
      await createProject();
      await time.increaseTo(deadline + 1n);
      await expect(unlock.connect(safe).activate("ondo")).to.be.revertedWith("Past activation deadline");
    });
  });

  // ─── Unlock math ───────────────────────────────────────────────────────────

  describe("Usage earns it, time caps it", function () {
    let pid;
    beforeEach(async function () {
      await fundAndAdd(["ondo"]);
      pid = await createProject();
      await unlock.connect(safe).activate("ondo");
    });

    it("releases nothing with no usage, however long it waits", async function () {
      await time.increase(RELEASE * 2n);
      expect(await unlock.releasable(H("ondo"))).to.equal(0n);
      await expect(unlock.release("ondo")).to.be.revertedWith("Nothing to release");
    });

    it("caps heavy early usage by time", async function () {
      await makeClaims(pid, Number(FULL_AT)); // fully earned immediately
      expect(await unlock.earned(H("ondo"))).to.equal(BUCKET);

      await time.increase(RELEASE / 4n);
      const r = await unlock.releasable(H("ondo"));
      // ~25% of the bucket (a few seconds of drift from the claim transactions)
      expect(r).to.be.closeTo(BUCKET / 4n, BUCKET / 1000n);
    });

    it("caps slow usage by usage", async function () {
      await makeClaims(pid, 10); // 10% earned
      await time.increase(RELEASE); // time cap fully open
      expect(await unlock.releasable(H("ondo"))).to.equal(BUCKET / 10n);
    });

    it("never earns more than the bucket", async function () {
      await makeClaims(pid, Number(FULL_AT) + 15);
      await time.increase(RELEASE * 3n);
      expect(await unlock.releasable(H("ondo"))).to.equal(BUCKET);
    });

    it("pays the project's current owner, and anyone can trigger it", async function () {
      await makeClaims(pid, 10);
      await time.increase(RELEASE);
      await registry.connect(ondo).transferProjectOwnership(pid, newOwner.address);

      await expect(unlock.connect(stranger).release("ondo"))
        .to.emit(unlock, "Released")
        .withArgs(H("ondo"), newOwner.address, BUCKET / 10n);
      expect(await token.balanceOf(newOwner.address)).to.equal(BUCKET / 10n);
      expect(await token.balanceOf(stranger.address)).to.equal(0n);
    });

    it("releases incrementally without paying anything twice", async function () {
      await makeClaims(pid, 10);
      await time.increase(RELEASE);
      await unlock.release("ondo");
      await expect(unlock.release("ondo")).to.be.revertedWith("Nothing to release");

      await makeClaims(pid, 10, ondo, 10);
      await unlock.release("ondo");
      expect(await token.balanceOf(ondo.address)).to.equal(BUCKET / 5n);
      expect(await unlock.totalCommitted()).to.equal(BUCKET - BUCKET / 5n);
    });
  });

  // ─── Exits ─────────────────────────────────────────────────────────────────

  describe("Exits", function () {
    it("cancel keeps what was earned and returns the rest", async function () {
      await fundAndAdd(["ondo"]);
      const pid = await createProject();
      await unlock.connect(safe).activate("ondo");
      await makeClaims(pid, 30); // 30% earned

      const before = await token.balanceOf(safe.address);
      await expect(unlock.connect(safe).cancel("ondo", safe.address))
        .to.emit(unlock, "BucketCancelled")
        .withArgs(H("ondo"), (BUCKET * 30n) / 100n, (BUCKET * 70n) / 100n, safe.address);
      expect(await token.balanceOf(safe.address)).to.equal(before + (BUCKET * 70n) / 100n);

      // more usage no longer counts; the earned 30% still releases on the time curve
      await makeClaims(pid, 30, ondo, 30);
      await time.increase(RELEASE);
      await unlock.release("ondo");
      expect(await token.balanceOf(ondo.address)).to.equal((BUCKET * 30n) / 100n);
      expect(await unlock.totalCommitted()).to.equal(0n);
    });

    it("sweep returns an unactivated bucket, but only after the deadline", async function () {
      await fundAndAdd(["ondo"]);
      await expect(unlock.connect(safe).sweep("ondo", safe.address)).to.be.revertedWith(
        "Before activation deadline"
      );
      await time.increaseTo(deadline + 1n);
      await unlock.connect(safe).sweep("ondo", safe.address);
      expect(await unlock.totalCommitted()).to.equal(0n);
      await expect(unlock.connect(safe).sweep("ondo", safe.address)).to.be.revertedWith("Cancelled");
    });

    it("sweep cannot touch an activated bucket", async function () {
      await fundAndAdd(["ondo"]);
      await createProject();
      await unlock.connect(safe).activate("ondo");
      await time.increaseTo(deadline + 1n);
      await expect(unlock.connect(safe).sweep("ondo", safe.address)).to.be.revertedWith("Activated");
    });

    it("recoverExcess moves only what no bucket is owed", async function () {
      await fundAndAdd(["ondo"]);
      await token.connect(safe).transfer(await unlock.getAddress(), 5n);
      await expect(unlock.connect(safe).recoverExcess(safe.address))
        .to.emit(unlock, "ExcessRecovered")
        .withArgs(safe.address, 5n);
      await expect(unlock.connect(safe).recoverExcess(safe.address)).to.be.revertedWith("No excess");
      expect(await token.balanceOf(await unlock.getAddress())).to.equal(BUCKET);
    });
  });

  describe("Token", function () {
    it("mints the whole fixed supply once and has no owner or mint", async function () {
      expect(await token.totalSupply()).to.equal(ethers.parseEther("1000000000"));
      expect(await token.balanceOf(safe.address)).to.equal(ethers.parseEther("1000000000") - 0n);
      expect(token.interface.getFunction("mint", [])).to.equal(null);
      expect(token.interface.getFunction("owner", [])).to.equal(null);
    });
  });
});
