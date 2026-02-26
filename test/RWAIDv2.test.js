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

// ─── Constants ────────────────────────────────────────────────────────────────

const MINIMUM_FEE = 500_000n;          // $0.50 USDC (6 decimals)
const CLAIM_FEE   = 1_000_000n;        // $1.00 USDC
const PROTOCOL_FEE_PERCENT = 30n;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RWAIDv2", function () {
  let usdc, registry;
  let multisig, platform, user1, user2, user3;

  beforeEach(async function () {
    [, multisig, platform, user1, user2, user3] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    const RWAIDv2 = await ethers.getContractFactory("RWAIDv2");
    registry = await RWAIDv2.deploy(
      await usdc.getAddress(),
      multisig.address
    );

    // Fund users with USDC
    const FUND = ethers.parseUnits("1000", 6);
    await usdc.mint(user1.address, FUND);
    await usdc.mint(user2.address, FUND);
    await usdc.mint(user3.address, FUND);
  });

  // ─── Project Creation ──────────────────────────────────────────────────────

  describe("Project Creation", function () {
    it("creates a project for free", async function () {
      await expect(
        registry.connect(platform).createProject("securitize", platform.address, 0, false)
      )
        .to.emit(registry, "ProjectCreated")
        .withArgs(1, "securitize", platform.address, platform.address, 0, false);

      expect(await registry.nextProjectId()).to.equal(2n);
    });

    it("normalizes uppercase slugs to lowercase", async function () {
      await expect(
        registry.connect(platform).createProject("Securitize", platform.address, 0, false)
      )
        .to.emit(registry, "ProjectCreated")
        .withArgs(1, "securitize", platform.address, platform.address, 0, false);
    });

    it("accepts digits and hyphens in the middle of a slug", async function () {
      await expect(
        registry.connect(platform).createProject("ondo-v2", platform.address, 0, false)
      ).to.emit(registry, "ProjectCreated");
    });

    it("rejects slug with underscore or invalid char", async function () {
      await expect(
        registry.connect(platform).createProject("sec_uritize", platform.address, 0, false)
      ).to.be.revertedWith("Invalid slug character");
    });

    it("rejects slug shorter than 3 chars", async function () {
      await expect(
        registry.connect(platform).createProject("ab", platform.address, 0, false)
      ).to.be.revertedWith("Slug: 3-32 chars");
    });

    it("rejects slug longer than 32 chars", async function () {
      await expect(
        registry
          .connect(platform)
          .createProject("a".repeat(33), platform.address, 0, false)
      ).to.be.revertedWith("Slug: 3-32 chars");
    });

    it("rejects slug with leading hyphen", async function () {
      await expect(
        registry.connect(platform).createProject("-abc", platform.address, 0, false)
      ).to.be.revertedWith("Invalid slug character");
    });

    it("rejects slug with trailing hyphen", async function () {
      await expect(
        registry.connect(platform).createProject("abc-", platform.address, 0, false)
      ).to.be.revertedWith("Invalid slug character");
    });

    it("rejects duplicate slug", async function () {
      await registry.connect(platform).createProject("ondo", platform.address, 0, false);
      await expect(
        registry.connect(platform).createProject("ondo", platform.address, 0, false)
      ).to.be.revertedWith("Slug taken");
    });

    it("rejects zero treasury", async function () {
      await expect(
        registry.connect(platform).createProject("ondo", ethers.ZeroAddress, 0, false)
      ).to.be.revertedWith("Treasury required");
    });

    it("increments nextProjectId", async function () {
      await registry.connect(platform).createProject("proj1", platform.address, 0, false);
      await registry.connect(platform).createProject("proj2", platform.address, 0, false);
      expect(await registry.nextProjectId()).to.equal(3n);
    });
  });

  // ─── Namespace Reservation ────────────────────────────────────────────────

  describe("Namespace Reservation", function () {
    it("multisig can reserve a namespace", async function () {
      await expect(
        registry
          .connect(multisig)
          .reserveNamespace("ondo", platform.address, 30 * 24 * 3600)
      ).to.emit(registry, "NamespaceReserved");
    });

    it("reserved namespace can only be claimed by reserved address", async function () {
      await registry
        .connect(multisig)
        .reserveNamespace("ondo", platform.address, 30 * 24 * 3600);

      await expect(
        registry.connect(user1).createProject("ondo", user1.address, 0, false)
      ).to.be.revertedWith("Namespace reserved");

      // Reserved address can claim it
      await expect(
        registry.connect(platform).createProject("ondo", platform.address, 0, false)
      ).to.emit(registry, "ProjectCreated");
    });

    it("expired reservation allows anyone to register", async function () {
      await registry
        .connect(multisig)
        .reserveNamespace("ondo", platform.address, 1); // 1 second

      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine");

      await expect(
        registry.connect(user1).createProject("ondo", user1.address, 0, false)
      ).to.emit(registry, "ProjectCreated");
    });

    it("multisig can release a reservation early", async function () {
      await registry
        .connect(multisig)
        .reserveNamespace("ondo", platform.address, 30 * 24 * 3600);
      await registry.connect(multisig).releaseNamespace("ondo");

      await expect(
        registry.connect(user1).createProject("ondo", user1.address, 0, false)
      ).to.emit(registry, "ProjectCreated");
    });

    it("non-owner cannot reserve", async function () {
      await expect(
        registry
          .connect(platform)
          .reserveNamespace("ondo", platform.address, 30 * 24 * 3600)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("batchReserveNamespaces reserves multiple slugs", async function () {
      await expect(
        registry.connect(multisig).batchReserveNamespaces(
          ["maple", "centrifuge", "goldfinch"],
          [platform.address, user1.address, user2.address],
          7 * 24 * 3600
        )
      )
        .to.emit(registry, "NamespaceReserved")
        .and.to.emit(registry, "NamespaceReserved");
    });
  });

  // ─── USDC Claim ───────────────────────────────────────────────────────────

  describe("USDC Claim", function () {
    let projectId;
    let nameHash1, nameHash2;
    let leaf1, leaf2, tree;

    beforeEach(async function () {
      await registry
        .connect(platform)
        .createProject("test-project", platform.address, CLAIM_FEE, false);
      projectId = 1;

      nameHash1 = makeNameHash("alice");
      nameHash2 = makeNameHash("bob");
      leaf1 = makeLeaf(user1.address, nameHash1);
      leaf2 = makeLeaf(user2.address, nameHash2);
      tree = buildTree([leaf1, leaf2]);

      await registry
        .connect(platform)
        .updateMerkleRoot(projectId, getRoot(tree), 2);
    });

    it("splits USDC 70/30 correctly", async function () {
      await usdc.connect(user1).approve(await registry.getAddress(), CLAIM_FEE);

      const platformBefore = await usdc.balanceOf(platform.address);
      const protocolBefore = await usdc.balanceOf(multisig.address);

      await registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf1));

      const protocolShare = (CLAIM_FEE * PROTOCOL_FEE_PERCENT) / 100n;
      const platformShare = CLAIM_FEE - protocolShare;

      expect(await usdc.balanceOf(platform.address) - platformBefore).to.equal(platformShare);
      expect(await usdc.balanceOf(multisig.address) - protocolBefore).to.equal(protocolShare);
    });

    it("emits IdentityClaimed and FeeSplit", async function () {
      await usdc.connect(user1).approve(await registry.getAddress(), CLAIM_FEE);
      await expect(
        registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf1))
      )
        .to.emit(registry, "IdentityClaimed")
        .and.to.emit(registry, "FeeSplit");
    });

    it("mints an ERC-721 token", async function () {
      await usdc.connect(user1).approve(await registry.getAddress(), CLAIM_FEE);
      await registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf1));

      expect(await registry.balanceOf(user1.address)).to.equal(1n);
      expect(await registry.ownerOf(1)).to.equal(user1.address);
    });

    it("stores token metadata correctly", async function () {
      await usdc.connect(user1).approve(await registry.getAddress(), CLAIM_FEE);
      await registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf1));

      const meta = await registry.tokenMetadata(1);
      expect(meta.projectId).to.equal(1n);
      expect(meta.nameHash).to.equal(nameHash1);
    });

    it("maps ENS node to tokenId", async function () {
      await usdc.connect(user1).approve(await registry.getAddress(), CLAIM_FEE);
      await registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf1));

      const node = await registry.nameNodeFromHash(projectId, nameHash1);
      expect(await registry.nodeToTokenId(node)).to.equal(1n);
      expect(await registry.resolveAddr(node)).to.equal(user1.address);
    });

    it("enforces minimum fee when platform sets claimFee=0", async function () {
      await registry
        .connect(platform)
        .createProject("free-proj", platform.address, 0, false);
      const freeId = 2;

      const lf = makeLeaf(user1.address, nameHash1);
      const t = buildTree([lf]);
      await registry.connect(platform).updateMerkleRoot(freeId, getRoot(t), 1);

      await usdc.connect(user1).approve(await registry.getAddress(), MINIMUM_FEE);
      await expect(
        registry.connect(user1).claim(freeId, nameHash1, getProof(t, lf))
      ).to.emit(registry, "IdentityClaimed");
    });

    it("prevents double claiming", async function () {
      await usdc.connect(user1).approve(await registry.getAddress(), CLAIM_FEE * 2n);
      await registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf1));

      await expect(
        registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf1))
      ).to.be.revertedWith("Already claimed");
    });

    it("rejects invalid Merkle proof", async function () {
      await usdc.connect(user1).approve(await registry.getAddress(), CLAIM_FEE);
      // Use user2's proof for user1
      await expect(
        registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf2))
      ).to.be.revertedWith("Invalid proof");
    });

    it("reverts when USDC not approved", async function () {
      await expect(
        registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf1))
      ).to.be.reverted;
    });

    it("reverts on paused project", async function () {
      await registry.connect(platform).pauseProject(projectId);
      await usdc.connect(user1).approve(await registry.getAddress(), CLAIM_FEE);

      await expect(
        registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf1))
      ).to.be.revertedWith("Project not active");
    });

    it("increments project totalClaimed and totalRevenue", async function () {
      await usdc.connect(user1).approve(await registry.getAddress(), CLAIM_FEE);
      await registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf1));

      const proj = await registry.projects(projectId);
      expect(proj.totalClaimed).to.equal(1n);
      expect(proj.totalRevenue).to.equal(CLAIM_FEE);
    });
  });

  // ─── Soulbound Enforcement ────────────────────────────────────────────────

  describe("Soulbound (non-transferable) tokens", function () {
    let projectId;
    let nameHash1, leaf1, tree;

    beforeEach(async function () {
      // Create a soulbound project (transferable=false)
      await registry
        .connect(platform)
        .createProject("soulbound-proj", platform.address, MINIMUM_FEE, false);
      projectId = 1;

      nameHash1 = makeNameHash("alice");
      leaf1 = makeLeaf(user1.address, nameHash1);
      tree = buildTree([leaf1]);

      await registry.connect(platform).updateMerkleRoot(projectId, getRoot(tree), 1);
      await usdc.connect(user1).approve(await registry.getAddress(), MINIMUM_FEE);
      await registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf1));
    });

    it("soulbound token transfer reverts", async function () {
      await expect(
        registry.connect(user1).transferFrom(user1.address, user2.address, 1)
      ).to.be.revertedWith("Soulbound: non-transferable");
    });

    it("project owner can make token transferable post-mint", async function () {
      await registry.connect(platform).setTokenTransferable(1, true);
      await registry.connect(user1).transferFrom(user1.address, user2.address, 1);
      expect(await registry.ownerOf(1)).to.equal(user2.address);
    });

    it("non-project-owner cannot call setTokenTransferable", async function () {
      await expect(
        registry.connect(user1).setTokenTransferable(1, true)
      ).to.be.revertedWith("Not project owner");
    });
  });

  // ─── Transferable Tokens ──────────────────────────────────────────────────

  describe("Transferable tokens", function () {
    let projectId;
    let nameHash1, leaf1, tree;

    beforeEach(async function () {
      // Create a transferable project (transferable=true)
      await registry
        .connect(platform)
        .createProject("transferable-proj", platform.address, MINIMUM_FEE, true);
      projectId = 1;

      nameHash1 = makeNameHash("alice");
      leaf1 = makeLeaf(user1.address, nameHash1);
      tree = buildTree([leaf1]);

      await registry.connect(platform).updateMerkleRoot(projectId, getRoot(tree), 1);
      await usdc.connect(user1).approve(await registry.getAddress(), MINIMUM_FEE);
      await registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf1));
    });

    it("transferable token can be transferred", async function () {
      await registry.connect(user1).transferFrom(user1.address, user2.address, 1);
      expect(await registry.ownerOf(1)).to.equal(user2.address);
    });

    it("resolveAddr reflects new owner after transfer", async function () {
      const node = await registry.nameNodeFromHash(projectId, nameHash1);
      expect(await registry.resolveAddr(node)).to.equal(user1.address);

      await registry.connect(user1).transferFrom(user1.address, user2.address, 1);
      expect(await registry.resolveAddr(node)).to.equal(user2.address);
    });

    it("project owner can freeze a transferable token", async function () {
      await registry.connect(platform).setTokenTransferable(1, false);
      await expect(
        registry.connect(user1).transferFrom(user1.address, user2.address, 1)
      ).to.be.revertedWith("Soulbound: non-transferable");
    });

    it("project owner can toggle project-level default transferability", async function () {
      await registry.connect(platform).setProjectTransferable(projectId, false);
      const proj = await registry.projects(projectId);
      expect(proj.transferable).to.be.false;
    });
  });

  // ─── Identity Revocation ─────────────────────────────────────────────────

  describe("Identity Revocation", function () {
    let projectId;
    let nameHash1, leaf1, tree;

    beforeEach(async function () {
      await registry
        .connect(platform)
        .createProject("revoke-test", platform.address, MINIMUM_FEE, false);
      projectId = 1;

      nameHash1 = makeNameHash("alice");
      leaf1 = makeLeaf(user1.address, nameHash1);
      tree = buildTree([leaf1]);

      await registry.connect(platform).updateMerkleRoot(projectId, getRoot(tree), 1);
      await usdc.connect(user1).approve(await registry.getAddress(), MINIMUM_FEE);
      await registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf1));
    });

    it("project owner can revoke identity (burns token)", async function () {
      await expect(registry.connect(platform).revokeIdentity(projectId, 1))
        .to.emit(registry, "IdentityRevoked")
        .withArgs(projectId, nameHash1, 1);

      expect(await registry.balanceOf(user1.address)).to.equal(0n);
    });

    it("original claimer cannot re-claim after revocation (Already claimed)", async function () {
      await registry.connect(platform).revokeIdentity(projectId, 1);
      await usdc.connect(user1).approve(await registry.getAddress(), MINIMUM_FEE);

      // claimed[projectId][user1] is still true after revocation —
      // "Already claimed" fires before "Name revoked" for the original claimer
      await expect(
        registry.connect(user1).claim(projectId, nameHash1, getProof(tree, leaf1))
      ).to.be.revertedWith("Already claimed");
    });

    it("different user cannot claim a revoked name (Name revoked)", async function () {
      await registry.connect(platform).revokeIdentity(projectId, 1);

      // Build a new proof for user2 claiming the same revoked nameHash1
      const leaf2alt = makeLeaf(user2.address, nameHash1);
      const tree2 = buildTree([leaf2alt]);
      await registry.connect(platform).updateMerkleRoot(projectId, getRoot(tree2), 1);
      await usdc.connect(user2).approve(await registry.getAddress(), MINIMUM_FEE);

      await expect(
        registry.connect(user2).claim(projectId, nameHash1, getProof(tree2, leaf2alt))
      ).to.be.revertedWith("Name revoked");
    });

    it("resolveAddr returns zero after revocation", async function () {
      const node = await registry.nameNodeFromHash(projectId, nameHash1);
      expect(await registry.resolveAddr(node)).to.equal(user1.address);

      await registry.connect(platform).revokeIdentity(projectId, 1);
      expect(await registry.resolveAddr(node)).to.equal(ethers.ZeroAddress);
    });

    it("non-project-owner cannot revoke", async function () {
      await expect(
        registry.connect(user1).revokeIdentity(projectId, 1)
      ).to.be.revertedWith("Not project owner");
    });

    it("cannot revoke a token that belongs to a different project", async function () {
      // Create a second project owned by user2
      await registry
        .connect(user2)
        .createProject("other-proj", user2.address, 0, false);

      // user2 is project 2 owner but token 1 belongs to project 1 → "Wrong project"
      await expect(
        registry.connect(user2).revokeIdentity(2, 1)
      ).to.be.revertedWith("Wrong project");
    });
  });

  // ─── Project Pause / Unpause ──────────────────────────────────────────────

  describe("Project Pause / Unpause", function () {
    it("project owner can pause and unpause", async function () {
      await registry
        .connect(platform)
        .createProject("pause-test", platform.address, 0, false);
      const projectId = 1;

      await expect(registry.connect(platform).pauseProject(projectId))
        .to.emit(registry, "ProjectPaused")
        .withArgs(projectId);

      await expect(registry.connect(platform).unpauseProject(projectId))
        .to.emit(registry, "ProjectUnpaused")
        .withArgs(projectId);
    });

    it("non-owner cannot pause", async function () {
      await registry
        .connect(platform)
        .createProject("pause-test", platform.address, 0, false);

      await expect(
        registry.connect(user1).pauseProject(1)
      ).to.be.revertedWith("Not project owner");
    });
  });

  // ─── Protocol Fee Bounds ──────────────────────────────────────────────────

  describe("Protocol Fee Bounds", function () {
    it("multisig can set fee within bounds", async function () {
      await registry.connect(multisig).setProtocolFeePercent(20);
      expect(await registry.protocolFeePercent()).to.equal(20n);
    });

    it("cannot set fee above 50%", async function () {
      await expect(
        registry.connect(multisig).setProtocolFeePercent(51)
      ).to.be.revertedWith("Fee out of bounds");
    });

    it("cannot set fee below 10%", async function () {
      await expect(
        registry.connect(multisig).setProtocolFeePercent(9)
      ).to.be.revertedWith("Fee out of bounds");
    });

    it("fee change affects next claim split", async function () {
      await registry.connect(multisig).setProtocolFeePercent(50); // 50%

      await registry
        .connect(platform)
        .createProject("fee-test", platform.address, CLAIM_FEE, false);
      const projectId = 1;

      const nameHash_ = makeNameHash("alice");
      const leaf_ = makeLeaf(user1.address, nameHash_);
      const tree_ = buildTree([leaf_]);
      await registry.connect(platform).updateMerkleRoot(projectId, getRoot(tree_), 1);
      await usdc.connect(user1).approve(await registry.getAddress(), CLAIM_FEE);

      const protocolBefore = await usdc.balanceOf(multisig.address);
      await registry.connect(user1).claim(projectId, nameHash_, getProof(tree_, leaf_));
      const protocolAfter = await usdc.balanceOf(multisig.address);

      // 50% of $1 = $0.50
      expect(protocolAfter - protocolBefore).to.equal(500_000n);
    });
  });

  // ─── Platform Owner Transfer ───────────────────────────────────────────────

  describe("Project Ownership Transfer", function () {
    it("project owner can transfer ownership", async function () {
      await registry
        .connect(platform)
        .createProject("ownership-test", platform.address, 0, false);
      const projectId = 1;

      await expect(
        registry.connect(platform).transferProjectOwnership(projectId, user1.address)
      )
        .to.emit(registry, "ProjectOwnershipTransferred")
        .withArgs(projectId, platform.address, user1.address);

      expect((await registry.projects(projectId)).owner).to.equal(user1.address);
    });

    it("old owner loses access after transfer", async function () {
      await registry
        .connect(platform)
        .createProject("ownership-test", platform.address, 0, false);
      const projectId = 1;
      await registry.connect(platform).transferProjectOwnership(projectId, user1.address);

      await expect(
        registry.connect(platform).pauseProject(projectId)
      ).to.be.revertedWith("Not project owner");
    });

    it("new owner can manage the project", async function () {
      await registry
        .connect(platform)
        .createProject("ownership-test", platform.address, 0, false);
      const projectId = 1;
      await registry.connect(platform).transferProjectOwnership(projectId, user1.address);

      await expect(registry.connect(user1).pauseProject(projectId))
        .to.emit(registry, "ProjectPaused");
    });

    it("cannot transfer to zero address", async function () {
      await registry
        .connect(platform)
        .createProject("ownership-test", platform.address, 0, false);

      await expect(
        registry.connect(platform).transferProjectOwnership(1, ethers.ZeroAddress)
      ).to.be.revertedWith("Zero address");
    });
  });

  // ─── Multisig Admin Functions ─────────────────────────────────────────────

  describe("Multisig Admin", function () {
    it("multisig can update protocol treasury", async function () {
      await registry.connect(multisig).setProtocolTreasury(user3.address);
      expect(await registry.protocolTreasury()).to.equal(user3.address);
    });

    it("multisig can update minimum claim fee", async function () {
      await registry.connect(multisig).setMinimumClaimFee(1_000_000n);
      expect(await registry.minimumClaimFee()).to.equal(1_000_000n);
    });

    it("non-multisig cannot call admin functions", async function () {
      await expect(
        registry.connect(platform).setProtocolTreasury(user1.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");

      await expect(
        registry.connect(platform).setMinimumClaimFee(0)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");

      await expect(
        registry.connect(platform).setProtocolFeePercent(30)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  // ─── Project Update Functions ─────────────────────────────────────────────

  describe("Project Updates", function () {
    beforeEach(async function () {
      await registry
        .connect(platform)
        .createProject("update-test", platform.address, CLAIM_FEE, false);
    });

    it("project owner can update claim fee", async function () {
      await expect(registry.connect(platform).updateClaimFee(1, 2_000_000n))
        .to.emit(registry, "ClaimFeeUpdated")
        .withArgs(1, 2_000_000n);

      expect((await registry.projects(1)).claimFee).to.equal(2_000_000n);
    });

    it("project owner can update treasury", async function () {
      await expect(registry.connect(platform).updateTreasury(1, user3.address))
        .to.emit(registry, "TreasuryUpdated")
        .withArgs(1, user3.address);

      expect((await registry.projects(1)).treasury).to.equal(user3.address);
    });

    it("project owner can update merkle root", async function () {
      const newRoot = ethers.keccak256(ethers.toUtf8Bytes("newroot"));
      await expect(registry.connect(platform).updateMerkleRoot(1, newRoot, 100))
        .to.emit(registry, "MerkleRootUpdated")
        .withArgs(1, newRoot, 100);
    });
  });

  // ─── ENS Node Derivation ──────────────────────────────────────────────────

  describe("ENS Node Derivation", function () {
    it("computes projectNode from RWA_ID_ROOT_NODE + slugHash", async function () {
      await registry
        .connect(platform)
        .createProject("testslug", platform.address, 0, false);

      const RWA_ID_ROOT_NODE =
        "0xe560d9c28239bdc04a0064c1a6473ce3a69ac03d1a8a39daedbdf2296db4892f";
      const slugHash = ethers.keccak256(ethers.toUtf8Bytes("testslug"));
      const expected = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "bytes32"], [RWA_ID_ROOT_NODE, slugHash])
      );

      expect(await registry.projectNode(1)).to.equal(expected);
    });

    it("resolveAddr returns zero for unclaimed node", async function () {
      const node = ethers.keccak256(ethers.toUtf8Bytes("random-node"));
      expect(await registry.resolveAddr(node)).to.equal(ethers.ZeroAddress);
    });
  });
});

// ─── RwaIdWildcardResolverV2 ──────────────────────────────────────────────────

describe("RwaIdWildcardResolverV2", function () {
  let resolver;
  let owner, signer, user1;
  const GATEWAY = "https://gateway.rwa-id.com/{sender}/{data}.json";

  beforeEach(async function () {
    [owner, signer, user1] = await ethers.getSigners();

    const Resolver = await ethers.getContractFactory("RwaIdWildcardResolverV2");
    resolver = await Resolver.deploy(owner.address, signer.address, [GATEWAY]);
  });

  it("initializes with correct owner, signer, and urls", async function () {
    expect(await resolver.owner()).to.equal(owner.address);
    expect(await resolver.trustedSigner()).to.equal(signer.address);
    const urls = await resolver.getUrls();
    expect(urls[0]).to.equal(GATEWAY);
  });

  it("owner can update gateway URLs", async function () {
    const newUrls = [
      "https://gateway.rwa-id.com/{sender}/{data}.json",
      "https://backup.rwa-id.com/{sender}/{data}.json",
    ];
    await expect(resolver.connect(owner).setUrls(newUrls))
      .to.emit(resolver, "UrlsUpdated");

    const urls = await resolver.getUrls();
    expect(urls.length).to.equal(2);
    expect(urls[1]).to.equal(newUrls[1]);
  });

  it("owner can update trusted signer", async function () {
    await expect(resolver.connect(owner).setTrustedSigner(user1.address))
      .to.emit(resolver, "TrustedSignerUpdated")
      .withArgs(signer.address, user1.address);

    expect(await resolver.trustedSigner()).to.equal(user1.address);
  });

  it("non-owner cannot update URLs", async function () {
    await expect(
      resolver.connect(user1).setUrls([GATEWAY])
    ).to.be.revertedWithCustomError(resolver, "OwnableUnauthorizedAccount");
  });

  it("non-owner cannot update trusted signer", async function () {
    await expect(
      resolver.connect(user1).setTrustedSigner(user1.address)
    ).to.be.revertedWithCustomError(resolver, "OwnableUnauthorizedAccount");
  });

  it("owner can transfer ownership", async function () {
    await resolver.connect(owner).transferOwnership(user1.address);
    expect(await resolver.owner()).to.equal(user1.address);
  });

  it("supportsInterface returns true for ENSIP-10 and ERC-165", async function () {
    expect(await resolver.supportsInterface("0x9061b923")).to.be.true;  // ENSIP-10
    expect(await resolver.supportsInterface("0x01ffc9a7")).to.be.true;  // ERC-165
    expect(await resolver.supportsInterface("0xdeadbeef")).to.be.false;
  });

  it("resolve() reverts with OffchainLookup (CCIP-Read trigger)", async function () {
    // addr(bytes32) call: selector 0x3b3b57de + 32 bytes node
    const addrCalldata = ethers.concat([
      "0x3b3b57de",
      ethers.zeroPadValue(
        "0xe560d9c28239bdc04a0064c1a6473ce3a69ac03d1a8a39daedbdf2296db4892f",
        32
      ),
    ]);

    // DNS-encoded "test.rwa-id.eth" (simplified)
    const dnsName = ethers.toUtf8Bytes("test");

    await expect(
      resolver.resolve(dnsName, addrCalldata)
    ).to.be.revertedWithCustomError(resolver, "OffchainLookup");
  });

  it("setUrls reverts with empty array", async function () {
    await expect(resolver.connect(owner).setUrls([])).to.be.revertedWith(
      "no urls"
    );
  });
});
