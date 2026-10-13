const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLeaf(addr, nameHashHex) {
  return ethers.keccak256(ethers.solidityPacked(["address", "bytes32"], [addr, nameHashHex]));
}

function makeNameHash(name) {
  return ethers.keccak256(ethers.toUtf8Bytes(name));
}

function buildTree(leaves) {
  return new MerkleTree(
    leaves.map((l) => Buffer.from(l.slice(2), "hex")),
    (x) => Buffer.from(ethers.keccak256(x).slice(2), "hex"),
    { sortPairs: true }
  );
}

const getProof = (tree, leaf) => tree.getHexProof(Buffer.from(leaf.slice(2), "hex"));
const getRoot = (tree) => "0x" + tree.getRoot().toString("hex");

// ─── Constants ────────────────────────────────────────────────────────────────

const MINIMUM_FEE = 500_000n; // $0.50 (6 decimals)
const CLAIM_FEE = 1_000_000n; // $1.00

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RWAIDv4", function () {
  let usdg, registry;
  let multisig, platform, user1, user2, user3, relayer, stranger;

  beforeEach(async function () {
    [, multisig, platform, user1, user2, user3, relayer, stranger] = await ethers.getSigners();

    // 6-decimal stand-in for USDG
    usdg = await (await ethers.getContractFactory("MockUSDC")).deploy();
    registry = await (await ethers.getContractFactory("RWAIDv4")).deploy(
      await usdg.getAddress(),
      multisig.address
    );

    const FUND = ethers.parseUnits("1000", 6);
    for (const s of [platform, user1, user2, user3, relayer, stranger]) {
      await usdg.mint(s.address, FUND);
    }
  });

  async function setupProject(labels = ["alice", "bob"], fee = CLAIM_FEE, transferable = false) {
    await registry.connect(platform).createProject("acme", platform.address, fee, transferable);

    const signers = [user1, user2, user3];
    const entries = labels.map((label, i) => {
      const nameHash = makeNameHash(label);
      return { label, nameHash, signer: signers[i], leaf: makeLeaf(signers[i].address, nameHash) };
    });

    const tree = buildTree(entries.map((e) => e.leaf));
    await registry.connect(platform).updateMerkleRoot(1, getRoot(tree), entries.length);
    return { projectId: 1, entries, tree };
  }

  const proofOf = (ctx, i) => getProof(ctx.tree, ctx.entries[i].leaf);

  async function claim(ctx, i, fee = CLAIM_FEE) {
    const e = ctx.entries[i];
    await usdg.connect(e.signer).approve(await registry.getAddress(), fee);
    return registry.connect(e.signer).claim(1, e.label, proofOf(ctx, i));
  }

  // ─── Carried over from v3 ──────────────────────────────────────────────────

  describe("v3 behaviour carried over", function () {
    it("mints the identity, maps the ENS node and resolves to the holder", async function () {
      const ctx = await setupProject();
      await claim(ctx, 0);

      expect(await registry.ownerOf(1)).to.equal(user1.address);
      expect(await registry.fullName(1)).to.equal("alice.acme.rwa-id.eth");
      const node = await registry.nameNodeFromHash(1, ctx.entries[0].nameHash);
      expect(await registry.resolveAddr(node)).to.equal(user1.address);
    });

    it("keeps IdentityClaimed byte-identical to v3 so indexers keep working", async function () {
      const v3 = (await ethers.getContractFactory("RWAIDv3")).interface;
      const v4 = registry.interface;
      expect(v4.getEvent("IdentityClaimed").topicHash).to.equal(v3.getEvent("IdentityClaimed").topicHash);
      expect(v4.getEvent("ProjectCreated").topicHash).to.equal(v3.getEvent("ProjectCreated").topicHash);
      expect(v4.getEvent("FeeSplit").topicHash).to.equal(v3.getEvent("FeeSplit").topicHash);
    });

    it("decodes projects() exactly as v3 did", async function () {
      await setupProject();
      const v3 = (await ethers.getContractFactory("RWAIDv3")).interface.getFunction("projects");
      expect(registry.interface.getFunction("projects").format("full")).to.equal(v3.format("full"));
    });

    it("splits the fee 70/30 between the platform and the protocol", async function () {
      const ctx = await setupProject();
      const p0 = await usdg.balanceOf(platform.address);
      const m0 = await usdg.balanceOf(multisig.address);

      await expect(claim(ctx, 0)).to.emit(registry, "FeeSplit").withArgs(1, 700_000n, 300_000n);
      expect(await usdg.balanceOf(platform.address)).to.equal(p0 + 700_000n);
      expect(await usdg.balanceOf(multisig.address)).to.equal(m0 + 300_000n);
    });

    it("still blocks transfers of a soulbound identity", async function () {
      const ctx = await setupProject();
      await claim(ctx, 0);
      await expect(
        registry.connect(user1).transferFrom(user1.address, user2.address, 1)
      ).to.be.revertedWith("Soulbound: non-transferable");
    });
  });

  // ─── Fee floor ─────────────────────────────────────────────────────────────

  describe("Minimum fee is a floor", function () {
    for (const [setFee, charged] of [
      [0n, MINIMUM_FEE],
      [1n, MINIMUM_FEE], // v3 charged 1 unit here and paid the protocol nothing
      [MINIMUM_FEE - 1n, MINIMUM_FEE],
      [MINIMUM_FEE, MINIMUM_FEE],
      [CLAIM_FEE, CLAIM_FEE],
    ]) {
      it(`a project fee of ${setFee} charges ${charged}`, async function () {
        const ctx = await setupProject(["alice"], setFee);
        expect(await registry.effectiveClaimFee(1)).to.equal(charged);

        const before = await usdg.balanceOf(user1.address);
        await claim(ctx, 0, charged);
        expect(before - (await usdg.balanceOf(user1.address))).to.equal(charged);
        expect(await registry.protocolFeesPaid(1)).to.equal((charged * 30n) / 100n);
      });
    }

    it("applies the floor to a fee lowered after creation", async function () {
      const ctx = await setupProject(["alice"], CLAIM_FEE);
      await registry.connect(platform).updateClaimFee(1, 1n);
      expect(await registry.effectiveClaimFee(1)).to.equal(MINIMUM_FEE);
      await expect(claim(ctx, 0, 1n)).to.be.reverted; // only approved 1 unit
    });
  });

  // ─── Labels follow ENS normalization ───────────────────────────────────────

  describe("Labels follow ENS normalization", function () {
    // validate-before-anything: a valid label reaches the project check and
    // reverts there; an invalid one reverts with its own "Label:" reason.
    async function labelVerdict(label) {
      try {
        await registry.claim.staticCall(999, label, []);
        return "valid";
      } catch (e) {
        const reason = e.reason || e.shortMessage || e.message;
        if (/Project not found/.test(reason)) return "valid";
        if (/Label/.test(reason)) return "invalid";
        throw e;
      }
    }

    for (const label of ["a_b", "ab_", "a_", "ab--cd", "xn--abc", "Alice", "a b", "a.b"]) {
      it(`rejects "${label}"`, async function () {
        expect(await labelVerdict(label)).to.equal("invalid");
      });
    }

    for (const label of ["alice", "_ab", "__ab", "_", "a-b", "a--b", "-ab", "ab-", "abc-", "007"]) {
      it(`accepts "${label}"`, async function () {
        expect(await labelVerdict(label)).to.equal("valid");
      });
    }

    it("agrees with viem's ENS normalizer on 1,000 random labels", async function () {
      const { normalize } = await import("viem/ens");
      // Weighted toward the characters ENS is strict about. mulberry32: a plain
      // `seed * 1103515245` LCG loses precision past 2^53 in JS and collapsed to
      // ~20 distinct labels, which made this test pass without testing anything.
      const alphabet = "ab0-_-_A";
      let seed = 4663;
      const rand = (n) => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) % n;
      };

      const disagreements = [];
      const labels = [];
      for (let i = 0; i < 1000; i++) {
        let label = "";
        const len = 1 + rand(7);
        for (let j = 0; j < len; j++) label += alphabet[rand(alphabet.length)];
        labels.push(label);

        let ensOk;
        try {
          ensOk = normalize(`${label}.acme.rwa-id.eth`) === `${label}.acme.rwa-id.eth`;
        } catch {
          ensOk = false;
        }
        const ours = (await labelVerdict(label)) === "valid";
        if (ours !== ensOk) disagreements.push(`${label} (ens=${ensOk}, v4=${ours})`);
      }
      expect(disagreements).to.deep.equal([]);
      // Guard the generator itself: it must actually reach the cases that matter.
      expect(new Set(labels).size).to.be.greaterThan(500);
      expect(labels.filter((l) => /^..--/.test(l)).length).to.be.greaterThan(10);
      expect(labels.filter((l) => /[^_]_/.test(l)).length).to.be.greaterThan(100);
    });

    it("rejects a slug with -- in positions 3-4", async function () {
      await expect(
        registry.connect(platform).createProject("ab--cd", platform.address, 0, false)
      ).to.be.revertedWith("Slug: -- at 3-4");
      await expect(registry.connect(platform).createProject("a--cd", platform.address, 0, false)).to.not.be
        .reverted;
    });
  });

  // ─── Sponsorship ───────────────────────────────────────────────────────────

  describe("Sponsorship", function () {
    let ctx;
    beforeEach(async function () {
      ctx = await setupProject(["alice", "bob"]);
    });

    async function fund(amount, from = platform) {
      await usdg.connect(from).approve(await registry.getAddress(), amount);
      return registry.connect(from).fundSponsorship(1, amount);
    }

    it("lets a client claim for free when the pool covers the fee", async function () {
      await fund(CLAIM_FEE * 2n);
      const userBefore = await usdg.balanceOf(user1.address);
      const platformBefore = await usdg.balanceOf(platform.address);
      const protocolBefore = await usdg.balanceOf(multisig.address);

      // no approval from the client at all
      await expect(registry.connect(user1).claim(1, "alice", proofOf(ctx, 0)))
        .to.emit(registry, "ClaimPaid")
        .withArgs(1, 1, await registry.getAddress(), true);

      expect(await usdg.balanceOf(user1.address)).to.equal(userBefore);
      expect(await usdg.balanceOf(platform.address)).to.equal(platformBefore + 700_000n);
      expect(await usdg.balanceOf(multisig.address)).to.equal(protocolBefore + 300_000n);
      expect(await registry.sponsorBalance(1)).to.equal(CLAIM_FEE);
      expect(await registry.totalSponsorBalance()).to.equal(CLAIM_FEE);
    });

    it("falls back to the caller when the pool cannot cover the whole fee", async function () {
      await fund(CLAIM_FEE - 1n);
      const before = await usdg.balanceOf(user1.address);
      await expect(claim(ctx, 0)).to.emit(registry, "ClaimPaid").withArgs(1, 1, user1.address, false);
      expect(before - (await usdg.balanceOf(user1.address))).to.equal(CLAIM_FEE);
      expect(await registry.sponsorBalance(1)).to.equal(CLAIM_FEE - 1n); // untouched
    });

    it("accepts funding from anyone, but only the project owner withdraws", async function () {
      await fund(CLAIM_FEE, stranger);
      await expect(
        registry.connect(stranger).withdrawSponsorship(1, CLAIM_FEE, stranger.address)
      ).to.be.revertedWith("Not project owner");

      const before = await usdg.balanceOf(platform.address);
      await expect(registry.connect(platform).withdrawSponsorship(1, CLAIM_FEE, platform.address))
        .to.emit(registry, "SponsorshipWithdrawn")
        .withArgs(1, platform.address, CLAIM_FEE);
      expect(await usdg.balanceOf(platform.address)).to.equal(before + CLAIM_FEE);
      expect(await registry.totalSponsorBalance()).to.equal(0n);
    });

    it("cannot withdraw more than the pool holds", async function () {
      await fund(CLAIM_FEE);
      await expect(
        registry.connect(platform).withdrawSponsorship(1, CLAIM_FEE + 1n, platform.address)
      ).to.be.revertedWith("Exceeds sponsor balance");
    });

    it("rejects funding a project that does not exist", async function () {
      await usdg.connect(platform).approve(await registry.getAddress(), CLAIM_FEE);
      await expect(registry.connect(platform).fundSponsorship(99, CLAIM_FEE)).to.be.revertedWith(
        "Project not found"
      );
    });

    it("never lets the protocol owner rescue sponsor funds", async function () {
      await fund(CLAIM_FEE);
      // a stray transfer straight to the contract IS rescuable
      await usdg.connect(stranger).transfer(await registry.getAddress(), 123n);

      await expect(
        registry.connect(multisig).rescueToken(await usdg.getAddress(), multisig.address, 124n)
      ).to.be.revertedWith("Sponsor funds are not rescuable");
      await registry.connect(multisig).rescueToken(await usdg.getAddress(), multisig.address, 123n);
      expect(await usdg.balanceOf(await registry.getAddress())).to.equal(CLAIM_FEE);
    });

    it("keeps pools separate between projects", async function () {
      await fund(CLAIM_FEE * 5n);
      await registry.connect(stranger).createProject("other", stranger.address, 0, false);
      expect(await registry.sponsorBalance(2)).to.equal(0n);
    });
  });

  // ─── claimFor ──────────────────────────────────────────────────────────────

  describe("claimFor", function () {
    let ctx;
    beforeEach(async function () {
      ctx = await setupProject(["alice", "bob"]);
    });

    it("lets a relayer deliver an identity; the token lands with the allowlisted wallet", async function () {
      await usdg.connect(relayer).approve(await registry.getAddress(), CLAIM_FEE);
      const userBefore = await usdg.balanceOf(user1.address);

      await expect(registry.connect(relayer).claimFor(1, user1.address, "alice", proofOf(ctx, 0)))
        .to.emit(registry, "ClaimPaid")
        .withArgs(1, 1, relayer.address, false);

      expect(await registry.ownerOf(1)).to.equal(user1.address);
      expect(await usdg.balanceOf(user1.address)).to.equal(userBefore); // client paid nothing
      expect(await registry.claimed(1, user1.address)).to.equal(true);
    });

    it("cannot redirect an identity to a different wallet", async function () {
      await usdg.connect(relayer).approve(await registry.getAddress(), CLAIM_FEE);
      await expect(
        registry.connect(relayer).claimFor(1, relayer.address, "alice", proofOf(ctx, 0))
      ).to.be.revertedWith("Invalid proof");
    });

    it("draws on the sponsor pool, so a platform pays fee and gas in one go", async function () {
      await usdg.connect(platform).approve(await registry.getAddress(), CLAIM_FEE * 2n);
      await registry.connect(platform).fundSponsorship(1, CLAIM_FEE * 2n);

      await registry.connect(platform).claimFor(1, user1.address, "alice", proofOf(ctx, 0));
      await registry.connect(platform).claimFor(1, user2.address, "bob", proofOf(ctx, 1));
      expect(await registry.ownerOf(1)).to.equal(user1.address);
      expect(await registry.ownerOf(2)).to.equal(user2.address);
      expect(await registry.sponsorBalance(1)).to.equal(0n);
    });

    it("cannot claim the same identity twice, whoever submits it", async function () {
      await usdg.connect(relayer).approve(await registry.getAddress(), CLAIM_FEE * 2n);
      await registry.connect(relayer).claimFor(1, user1.address, "alice", proofOf(ctx, 0));
      await expect(
        registry.connect(relayer).claimFor(1, user1.address, "alice", proofOf(ctx, 0))
      ).to.be.revertedWith("Already claimed");
      await expect(claim(ctx, 0)).to.be.revertedWith("Already claimed");
    });

    it("rejects the zero address as claimer", async function () {
      await expect(
        registry.connect(relayer).claimFor(1, ethers.ZeroAddress, "alice", proofOf(ctx, 0))
      ).to.be.revertedWith("Zero address");
    });
  });

  // ─── Platform artwork ──────────────────────────────────────────────────────

  describe("Platform artwork", function () {
    let ctx;
    const ART = "ipfs://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy";

    const metaOf = async (id) => {
      const uri = await registry.tokenURI(id);
      return JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));
    };

    beforeEach(async function () {
      ctx = await setupProject(["alice", "bob"]);
      await claim(ctx, 0);
    });

    it("shows the onchain RWA·ID card until a platform sets its own", async function () {
      const meta = await metaOf(1);
      expect(meta.image).to.match(/^data:image\/svg\+xml;base64,/);
      expect(meta.name).to.equal("alice.acme.rwa-id.eth");
    });

    it("shows the platform's art on every identity in the project, and tells marketplaces", async function () {
      await expect(registry.connect(platform).setProjectImage(1, ART))
        .to.emit(registry, "ProjectImageUpdated")
        .withArgs(1, ART)
        .and.to.emit(registry, "BatchMetadataUpdate")
        .withArgs(1, ethers.MaxUint256);

      await claim(ctx, 1); // minted after the change too
      for (const id of [1, 2]) {
        const meta = await metaOf(id);
        expect(meta.image).to.equal(ART);
        expect(meta.name).to.match(/\.acme\.rwa-id\.eth$/); // the name stays ours
      }
    });

    it("goes back to the onchain card when cleared", async function () {
      await registry.connect(platform).setProjectImage(1, ART);
      await registry.connect(platform).setProjectImage(1, "");
      expect((await metaOf(1)).image).to.match(/^data:image\/svg\+xml;base64,/);
    });

    it("does not leak art into other projects", async function () {
      await registry.connect(platform).setProjectImage(1, ART);
      await registry.connect(stranger).createProject("other", stranger.address, 0, false);
      expect(await registry.projectImage(2)).to.equal("");
    });

    it("is project-owner only", async function () {
      await expect(registry.connect(stranger).setProjectImage(1, ART)).to.be.revertedWith("Not project owner");
    });

    for (const uri of ["https://cdn.example.com/logo.png", "ar://abc123"]) {
      it(`accepts ${uri.split(":")[0]}`, async function () {
        await registry.connect(platform).setProjectImage(1, uri);
        expect((await metaOf(1)).image).to.equal(uri);
      });
    }

    for (const [uri, reason] of [
      ['ipfs://x","name":"forged', "Image: invalid character"],
      ["ipfs://x\\u0022", "Image: invalid character"],
      ["ipfs://x<script>", "Image: invalid character"],
      ["ipfs://has space", "Image: invalid character"],
      ["javascript:alert(1)", "Image: ipfs, https or ar"],
      ["http://insecure.example/logo.png", "Image: ipfs, https or ar"],
      ["data:image/svg+xml;base64,AAAA", "Image: ipfs, https or ar"],
      ["ipfs://" + "a".repeat(506), "Image: max 512 chars"],
    ]) {
      it(`rejects ${JSON.stringify(uri.slice(0, 32))}`, async function () {
        await expect(registry.connect(platform).setProjectImage(1, uri)).to.be.revertedWith(reason);
      });
    }

    it("always produces valid JSON metadata", async function () {
      await registry.connect(platform).setProjectImage(1, "https://x.example/a?b=1&c=%22");
      const meta = await metaOf(1); // throws if the JSON were broken
      expect(meta.image).to.equal("https://x.example/a?b=1&c=%22");
    });
  });

  // ─── Usage + ownership ─────────────────────────────────────────────────────

  describe("projectUsage", function () {
    it("reports owner, claims and protocol fees", async function () {
      const ctx = await setupProject(["alice", "bob"]);
      await claim(ctx, 0);
      await claim(ctx, 1);
      const [owner, claims, fees] = await registry.projectUsage(1);
      expect(owner).to.equal(platform.address);
      expect(claims).to.equal(2n);
      expect(fees).to.equal(600_000n);
    });
  });

  describe("Ownership", function () {
    it("hands the registry over in two steps", async function () {
      await registry.connect(multisig).transferOwnership(stranger.address);
      expect(await registry.owner()).to.equal(multisig.address);
      await registry.connect(stranger).acceptOwnership();
      expect(await registry.owner()).to.equal(stranger.address);
    });
  });
});
