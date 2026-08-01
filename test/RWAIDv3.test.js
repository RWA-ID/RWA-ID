const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** keccak256(abi.encodePacked(address, bytes32)) — matches claim leaf in contract */
function makeLeaf(addr, nameHashHex) {
  return ethers.keccak256(
    ethers.solidityPacked(["address", "bytes32"], [addr, nameHashHex])
  );
}

/** keccak256(bytes(name)) — deterministic name identifier */
function makeNameHash(name) {
  return ethers.keccak256(ethers.toUtf8Bytes(name));
}

/** Build a MerkleTree whose proof format is compatible with OZ MerkleProof.verify */
function buildTree(leaves) {
  return new MerkleTree(
    leaves.map((l) => Buffer.from(l.slice(2), "hex")),
    (x) => Buffer.from(ethers.keccak256(x).slice(2), "hex"),
    { sortPairs: true }
  );
}

function getProof(tree, leaf) {
  return tree.getHexProof(Buffer.from(leaf.slice(2), "hex"));
}

function getRoot(tree) {
  return "0x" + tree.getRoot().toString("hex");
}

/** Decode a data:application/json;base64 URI into an object. */
function decodeJsonURI(uri) {
  expect(uri).to.match(/^data:application\/json;base64,/);
  const b64 = uri.slice("data:application/json;base64,".length);
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

/** Decode a data:image/svg+xml;base64 URI into SVG markup. */
function decodeSvgURI(uri) {
  expect(uri).to.match(/^data:image\/svg\+xml;base64,/);
  const b64 = uri.slice("data:image/svg+xml;base64,".length);
  return Buffer.from(b64, "base64").toString("utf8");
}

function attr(meta, traitType) {
  return meta.attributes.find((a) => a.trait_type === traitType)?.value;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MINIMUM_FEE = 500_000n;   // $0.50 USDC (6 decimals)
const CLAIM_FEE = 1_000_000n;   // $1.00 USDC
const ERC4906_INTERFACE_ID = "0x49064906";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RWAIDv3", function () {
  let usdc, registry;
  let multisig, platform, user1, user2, user3;

  beforeEach(async function () {
    [, multisig, platform, user1, user2, user3] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    const RWAIDv3 = await ethers.getContractFactory("RWAIDv3");
    registry = await RWAIDv3.deploy(await usdc.getAddress(), multisig.address);

    const FUND = ethers.parseUnits("1000", 6);
    await usdc.mint(user1.address, FUND);
    await usdc.mint(user2.address, FUND);
    await usdc.mint(user3.address, FUND);
  });

  /**
   * Sets up a project with an allowlist and returns everything needed to claim.
   * Labels are lowercase because v3 rejects anything else — see "Label validation".
   */
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

  async function claim(entry, tree, projectId = 1, fee = CLAIM_FEE) {
    await usdc.connect(entry.signer).approve(await registry.getAddress(), fee);
    return registry.connect(entry.signer).claim(projectId, entry.label, getProof(tree, entry.leaf));
  }

  // ─── Label validation ──────────────────────────────────────────────────────

  describe("Label validation", function () {
    let ctx;

    beforeEach(async function () {
      ctx = await setupProject(["alice"]);
      await usdc.connect(user1).approve(await registry.getAddress(), CLAIM_FEE);
    });

    /** A label that is not in the tree fails proof verification, not validation. */
    function proofFor(entry) {
      return getProof(ctx.tree, entry.leaf);
    }

    it("accepts a lowercase alphanumeric label", async function () {
      await expect(claim(ctx.entries[0], ctx.tree)).to.not.be.reverted;
      expect(await registry.nextTokenId()).to.equal(2n);
    });

    it("rejects an uppercase label", async function () {
      // The v2 bug this prevents: the CCIP-Read gateway lowercases before
      // hashing, so "Alice" would mint at keccak("Alice") while ENS looked up
      // keccak("alice") — permanently unresolvable.
      await expect(
        registry.connect(user1).claim(1, "Alice", proofFor(ctx.entries[0]))
      ).to.be.revertedWith("Label: lowercase a-z 0-9 - _");
    });

    it("rejects a label containing a dot", async function () {
      await expect(
        registry.connect(user1).claim(1, "a.b", proofFor(ctx.entries[0]))
      ).to.be.revertedWith("Label: lowercase a-z 0-9 - _");
    });

    it("rejects an empty label", async function () {
      await expect(
        registry.connect(user1).claim(1, "", proofFor(ctx.entries[0]))
      ).to.be.revertedWith("Label: 1-63 chars");
    });

    it("rejects a label longer than 63 characters", async function () {
      await expect(
        registry.connect(user1).claim(1, "a".repeat(64), proofFor(ctx.entries[0]))
      ).to.be.revertedWith("Label: 1-63 chars");
    });

    it("accepts a label of exactly 63 characters", async function () {
      const long = "a".repeat(63);
      const nameHash = makeNameHash(long);
      const leaf = makeLeaf(user2.address, nameHash);
      const tree = buildTree([leaf]);

      await registry.connect(platform).createProject("longco", platform.address, 0, false);
      await registry.connect(platform).updateMerkleRoot(2, getRoot(tree), 1);
      await usdc.connect(user2).approve(await registry.getAddress(), MINIMUM_FEE);

      await expect(
        registry.connect(user2).claim(2, long, getProof(tree, leaf))
      ).to.not.be.reverted;
    });

    it("accepts hyphens and underscores", async function () {
      for (const [i, label] of ["a-b", "a_b"].entries()) {
        const nameHash = makeNameHash(label);
        const signer = [user2, user3][i];
        const leaf = makeLeaf(signer.address, nameHash);
        const tree = buildTree([leaf]);

        await registry.connect(platform).createProject(`co${i}abc`, platform.address, 0, false);
        const pid = 2 + i;
        await registry.connect(platform).updateMerkleRoot(pid, getRoot(tree), 1);
        await usdc.connect(signer).approve(await registry.getAddress(), MINIMUM_FEE);

        await expect(registry.connect(signer).claim(pid, label, getProof(tree, leaf))).to.not.be.reverted;
      }
    });

    // tokenURI() interpolates the label into JSON and into SVG, so a label that
    // could close either context would let a claimer forge their own metadata.
    const INJECTION = [
      ['a","name":"forged', "JSON string break"],
      ["a<script>x</script>", "SVG markup"],
      ["a&amp;b", "XML entity"],
      ["a b", "whitespace"],
      ['a"', "bare quote"],
    ];

    for (const [label, why] of INJECTION) {
      it(`rejects ${why} in a label`, async function () {
        await expect(
          registry.connect(user1).claim(1, label, proofFor(ctx.entries[0]))
        ).to.be.revertedWith("Label: lowercase a-z 0-9 - _");
      });
    }
  });

  // ─── Claiming by label ─────────────────────────────────────────────────────

  describe("Claim by label", function () {
    it("derives the same nameHash the caller would have passed to v2", async function () {
      const { entries, tree } = await setupProject();
      await claim(entries[0], tree);

      const meta = await registry.tokenMetadata(1);
      expect(meta.nameHash).to.equal(makeNameHash("alice"));
      expect(meta.label).to.equal("alice");
      expect(meta.projectId).to.equal(1n);
    });

    it("verifies a proof built the v2 way — leaf = keccak(claimer, keccak(label))", async function () {
      // The whole point of taking the label instead of the hash: allowlists and
      // roots generated for v2 must keep working without regenerating proofs.
      const { entries, tree } = await setupProject();
      const leaf = makeLeaf(user1.address, makeNameHash("alice"));

      expect(leaf).to.equal(entries[0].leaf);
      await expect(claim(entries[0], tree)).to.not.be.reverted;
    });

    it("rejects a label the caller is not allowlisted for", async function () {
      const { entries, tree } = await setupProject();
      // user1 is allowlisted for "alice", and tries to claim bob's label.
      await usdc.connect(user1).approve(await registry.getAddress(), CLAIM_FEE);
      await expect(
        registry.connect(user1).claim(1, "bob", getProof(tree, entries[1].leaf))
      ).to.be.revertedWith("Invalid proof");
    });

    it("emits IdentityClaimed carrying the plaintext label", async function () {
      const { entries, tree } = await setupProject();
      const node = await registry.nameNodeFromHash(1, entries[0].nameHash);

      await expect(claim(entries[0], tree))
        .to.emit(registry, "IdentityClaimed")
        .withArgs(1, entries[0].nameHash, user1.address, 1, node, CLAIM_FEE, "alice");
    });

    it("still splits the fee 70/30", async function () {
      const { entries, tree } = await setupProject();
      const platformBefore = await usdc.balanceOf(platform.address);
      const protocolBefore = await usdc.balanceOf(multisig.address);

      await claim(entries[0], tree);

      expect(await usdc.balanceOf(platform.address) - platformBefore).to.equal(700_000n);
      expect(await usdc.balanceOf(multisig.address) - protocolBefore).to.equal(300_000n);
    });

    it("maps the ENS node to the minted token", async function () {
      const { entries, tree } = await setupProject();
      await claim(entries[0], tree);

      const node = await registry.nameNodeFromHash(1, entries[0].nameHash);
      expect(await registry.nodeToTokenId(node)).to.equal(1n);
      expect(await registry.nodeClaimed(node)).to.equal(true);
      expect(await registry.resolveAddr(node)).to.equal(user1.address);
    });
  });

  // ─── fullName ──────────────────────────────────────────────────────────────

  describe("fullName", function () {
    it("returns label.slug.rwa-id.eth", async function () {
      const { entries, tree } = await setupProject();
      await claim(entries[0], tree);
      expect(await registry.fullName(1)).to.equal("alice.acme.rwa-id.eth");
    });

    it("reverts for a token that does not exist", async function () {
      await expect(registry.fullName(1)).to.be.reverted;
    });
  });

  // ─── tokenURI ──────────────────────────────────────────────────────────────

  describe("tokenURI", function () {
    let meta;

    beforeEach(async function () {
      const { entries, tree } = await setupProject();
      await claim(entries[0], tree);
      meta = decodeJsonURI(await registry.tokenURI(1));
    });

    it("names the token after the ENS name, not the token id", async function () {
      // v2 had no tokenURI at all, so marketplaces rendered "RWA ID #1".
      expect(meta.name).to.equal("alice.acme.rwa-id.eth");
    });

    it("describes the identity and its issuer", async function () {
      expect(meta.description).to.contain("alice.acme.rwa-id.eth");
      expect(meta.description).to.contain("acme");
    });

    it("embeds the artwork onchain rather than linking out", async function () {
      const svg = decodeSvgURI(meta.image);
      expect(svg).to.contain("<svg");
      expect(svg).to.contain("alice.acme.rwa-id.eth");
      expect(svg).to.contain(">R</text>");
      expect(meta.image).to.not.contain("http");
    });

    it("carries the identity's traits", async function () {
      expect(attr(meta, "Namespace")).to.equal("acme.rwa-id.eth");
      expect(attr(meta, "Label")).to.equal("alice");
      expect(attr(meta, "Project ID")).to.equal(1);
      expect(attr(meta, "Transferability")).to.equal("Soulbound");
    });

    it("reports transferable tokens as transferable", async function () {
      await registry.connect(platform).createProject("freeco", platform.address, 0, true);
      const nameHash = makeNameHash("carol");
      const leaf = makeLeaf(user3.address, nameHash);
      const tree = buildTree([leaf]);
      await registry.connect(platform).updateMerkleRoot(2, getRoot(tree), 1);
      await usdc.connect(user3).approve(await registry.getAddress(), MINIMUM_FEE);
      await registry.connect(user3).claim(2, "carol", getProof(tree, leaf));

      const m = decodeJsonURI(await registry.tokenURI(2));
      expect(attr(m, "Transferability")).to.equal("Transferable");
    });

    it("dates the claim for marketplace display", async function () {
      const claimed = meta.attributes.find((a) => a.trait_type === "Claimed");
      expect(claimed.display_type).to.equal("date");
      expect(Number(claimed.value)).to.be.greaterThan(0);
    });

    it("steps the caption down so long names stay inside the card", async function () {
      const long = "a".repeat(40);
      const nameHash = makeNameHash(long);
      const leaf = makeLeaf(user2.address, nameHash);
      const tree = buildTree([leaf]);
      await registry.connect(platform).createProject("longco", platform.address, 0, false);
      await registry.connect(platform).updateMerkleRoot(2, getRoot(tree), 1);
      await usdc.connect(user2).approve(await registry.getAddress(), MINIMUM_FEE);
      await registry.connect(user2).claim(2, long, getProof(tree, leaf));

      const shortSvg = decodeSvgURI(meta.image);
      const longSvg = decodeSvgURI(decodeJsonURI(await registry.tokenURI(2)).image);

      const size = (svg) => Number(svg.match(/font-size="(\d+)" font-weight="500"/)[1]);
      expect(size(longSvg)).to.be.lessThan(size(shortSvg));
    });

    it("reverts for a token that does not exist", async function () {
      await expect(registry.tokenURI(99)).to.be.reverted;
    });

    it("reverts once an identity is revoked and burned", async function () {
      await registry.connect(platform).revokeIdentity(1, 1);
      await expect(registry.tokenURI(1)).to.be.reverted;
    });
  });

  // ─── contractURI ───────────────────────────────────────────────────────────

  describe("contractURI", function () {
    it("renders collection metadata onchain by default", async function () {
      const meta = decodeJsonURI(await registry.contractURI());
      expect(meta.name).to.equal("RWA ID");
      expect(meta.description).to.contain("real-world asset");
      expect(decodeSvgURI(meta.image)).to.contain("<svg");
    });

    it("lets the multisig override it", async function () {
      await registry.connect(multisig).setContractURI("ipfs://collection");
      expect(await registry.contractURI()).to.equal("ipfs://collection");
    });

    it("falls back to the onchain render when cleared", async function () {
      await registry.connect(multisig).setContractURI("ipfs://collection");
      await registry.connect(multisig).setContractURI("");
      expect(await registry.contractURI()).to.match(/^data:application\/json;base64,/);
    });

    it("emits ContractURIUpdated", async function () {
      await expect(registry.connect(multisig).setContractURI("ipfs://x"))
        .to.emit(registry, "ContractURIUpdated");
    });

    it("is multisig-only", async function () {
      await expect(registry.connect(platform).setContractURI("ipfs://x")).to.be.reverted;
    });
  });

  // ─── baseURI escape hatch ──────────────────────────────────────────────────

  describe("baseURI", function () {
    beforeEach(async function () {
      const { entries, tree } = await setupProject();
      await claim(entries[0], tree);
    });

    it("is empty by default so metadata stays onchain", async function () {
      expect(await registry.baseURI()).to.equal("");
      expect(await registry.tokenURI(1)).to.match(/^data:application\/json;base64,/);
    });

    it("takes precedence over the onchain renderer once set", async function () {
      await registry.connect(multisig).setBaseURI("https://meta.rwa-id.com/");
      expect(await registry.tokenURI(1)).to.equal("https://meta.rwa-id.com/1");
    });

    it("restores the onchain renderer when cleared", async function () {
      await registry.connect(multisig).setBaseURI("https://meta.rwa-id.com/");
      await registry.connect(multisig).setBaseURI("");
      expect(await registry.tokenURI(1)).to.match(/^data:application\/json;base64,/);
    });

    it("emits BatchMetadataUpdate so marketplaces re-read", async function () {
      await expect(registry.connect(multisig).setBaseURI("https://meta.rwa-id.com/"))
        .to.emit(registry, "BatchMetadataUpdate")
        .withArgs(1, ethers.MaxUint256);
    });

    it("is multisig-only", async function () {
      await expect(registry.connect(platform).setBaseURI("https://evil/")).to.be.reverted;
    });
  });

  // ─── ERC-165 ───────────────────────────────────────────────────────────────

  describe("supportsInterface", function () {
    it("advertises ERC-4906 metadata updates", async function () {
      expect(await registry.supportsInterface(ERC4906_INTERFACE_ID)).to.equal(true);
    });

    it("still advertises ERC-721 and its metadata extension", async function () {
      expect(await registry.supportsInterface("0x80ac58cd")).to.equal(true); // ERC-721
      expect(await registry.supportsInterface("0x5b5e139f")).to.equal(true); // ERC721Metadata
      expect(await registry.supportsInterface("0x01ffc9a7")).to.equal(true); // ERC-165
    });

    it("rejects an unsupported interface", async function () {
      expect(await registry.supportsInterface("0xdeadbeef")).to.equal(false);
    });
  });

  // ─── Interaction with inherited behaviour ──────────────────────────────────

  describe("Soulbound enforcement with stored labels", function () {
    it("blocks transfer of a soulbound identity", async function () {
      const { entries, tree } = await setupProject();
      await claim(entries[0], tree);

      await expect(
        registry.connect(user1).transferFrom(user1.address, user2.address, 1)
      ).to.be.revertedWith("Soulbound: non-transferable");
    });

    it("keeps the label and metadata intact after a permitted transfer", async function () {
      const { entries, tree } = await setupProject(["alice", "bob"], CLAIM_FEE, true);
      await claim(entries[0], tree);

      await registry.connect(user1).transferFrom(user1.address, user2.address, 1);

      expect(await registry.ownerOf(1)).to.equal(user2.address);
      expect(await registry.fullName(1)).to.equal("alice.acme.rwa-id.eth");
      expect(decodeJsonURI(await registry.tokenURI(1)).name).to.equal("alice.acme.rwa-id.eth");

      // resolveAddr follows the holder, so ENS reflects the transfer.
      const node = await registry.nameNodeFromHash(1, entries[0].nameHash);
      expect(await registry.resolveAddr(node)).to.equal(user2.address);
    });
  });
});
