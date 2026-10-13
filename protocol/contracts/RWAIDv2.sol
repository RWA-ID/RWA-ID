// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * RWA ID v2
 *
 * ENS-native identity registry on Ethereum mainnet.
 *
 * Key improvements over v1:
 * - ERC-721 identity NFTs (soulbound OR transferable, per project/token)
 * - USDC claim fees with 70/30 platform/protocol split
 * - Free project creation (no ETH gate)
 * - Namespace reservation to prevent front-running
 * - Merkle allowlist for claims
 * - Identity revocation (burns token, clears ENS node)
 * - CCIP-Read compatible: nodeToTokenId() for gateway lookups
 *   → resolveAddr(node) returns ownerOf(tokenId), so transfers are reflected automatically
 *
 * ENS node derivation (hash-only, compatible with v1 resolver):
 *   rootNode    = namehash("rwa-id.eth")
 *   projectNode = keccak256(abi.encodePacked(rootNode, slugHash))
 *   nameNode    = keccak256(abi.encodePacked(projectNode, nameHash))
 *
 * Claim leaf format:
 *   leaf = keccak256(abi.encodePacked(claimer, nameHash))
 */
contract RWAIDv2 is ERC721, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // namehash("rwa-id.eth") — same constant as v1 for ENS compatibility
    bytes32 public constant RWA_ID_ROOT_NODE =
        0xe560d9c28239bdc04a0064c1a6473ce3a69ac03d1a8a39daedbdf2296db4892f;

    // USDC token (immutable — set at deploy time)
    IERC20 public immutable usdc;

    // Protocol treasury (multisig)
    address public protocolTreasury;

    // ===== Fee Configuration =====
    uint256 public minimumClaimFee = 500_000;       // $0.50 USDC (6 decimals)
    uint256 public protocolFeePercent = 30;          // 30% to protocol
    uint256 public constant MAX_PROTOCOL_FEE = 50;
    uint256 public constant MIN_PROTOCOL_FEE = 10;

    // ===== Token / Project Counters =====
    uint256 public nextTokenId = 1;
    uint256 public nextProjectId = 1;

    // ===== Project Data =====
    struct Project {
        address owner;
        string slug;
        bytes32 slugHash;
        address treasury;
        uint256 claimFee;       // USDC (6 decimals). 0 = protocol minimum applies
        bool transferable;      // default transferability for tokens minted in this project
        bytes32 merkleRoot;
        bool active;
        uint256 totalClaimed;
        uint256 totalRevenue;   // cumulative USDC collected
    }

    mapping(uint256 => Project) public projects;
    mapping(bytes32 => uint256) public projectIdBySlugHash;

    // ===== Claim State =====
    // projectId => address => has claimed?
    mapping(uint256 => mapping(address => bool)) public claimed;
    // projectId => nameHash => revoked?
    mapping(uint256 => mapping(bytes32 => bool)) public revoked;

    // ===== Token Metadata =====
    struct IdentityMetadata {
        uint256 projectId;
        bytes32 nameHash;
        uint256 claimedAt;
    }

    mapping(uint256 => IdentityMetadata) public tokenMetadata;
    mapping(uint256 => bool) public tokenTransferable;

    // ===== ENS Mappings (for CCIP-Read gateway) =====
    mapping(bytes32 => uint256) public nodeToTokenId;
    mapping(bytes32 => bool) public nodeClaimed;

    // ===== Namespace Reservations =====
    mapping(bytes32 => address) public reservedTo;
    mapping(bytes32 => uint256) public reservationExpiry;

    // ===== Events =====
    event ProjectCreated(
        uint256 indexed projectId,
        string slug,
        address indexed owner,
        address treasury,
        uint256 claimFee,
        bool transferable
    );
    event MerkleRootUpdated(
        uint256 indexed projectId,
        bytes32 newRoot,
        uint256 totalAllowlisted
    );
    event IdentityClaimed(
        uint256 indexed projectId,
        bytes32 indexed nameHash,
        address indexed claimer,
        uint256 tokenId,
        bytes32 node,
        uint256 feePaid
    );
    event FeeSplit(
        uint256 indexed projectId,
        uint256 platformShare,
        uint256 protocolShare
    );
    event IdentityRevoked(
        uint256 indexed projectId,
        bytes32 nameHash,
        uint256 tokenId
    );
    event ProjectPaused(uint256 indexed projectId);
    event ProjectUnpaused(uint256 indexed projectId);
    event MinimumFeeUpdated(uint256 newFee);
    event ProtocolFeeUpdated(uint256 newPercent);
    event ProtocolTreasuryUpdated(address newTreasury);
    event NamespaceReserved(
        bytes32 indexed slugHash,
        string slug,
        address reservedFor,
        uint256 expiry
    );
    event NamespaceReleased(bytes32 indexed slugHash, string slug);
    event ProjectTransferabilityUpdated(uint256 indexed projectId, bool transferable);
    event TokenTransferabilityUpdated(uint256 indexed tokenId, bool transferable);
    event ClaimFeeUpdated(uint256 indexed projectId, uint256 newFee);
    event TreasuryUpdated(uint256 indexed projectId, address newTreasury);
    event ProjectOwnershipTransferred(
        uint256 indexed projectId,
        address previousOwner,
        address newOwner
    );

    // =============================================================
    // Constructor
    // =============================================================
    constructor(
        address _usdc,
        address _multisig
    ) ERC721("RWA ID", "RWAID") Ownable(_multisig) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_multisig != address(0), "Invalid multisig address");
        usdc = IERC20(_usdc);
        protocolTreasury = _multisig;
    }

    // =============================================================
    // Slug helpers
    // =============================================================
    function _validateAndNormalizeSlug(
        string memory slug
    ) internal pure returns (string memory norm, bytes32 slugHash) {
        bytes memory s = bytes(slug);
        require(s.length >= 3 && s.length <= 32, "Slug: 3-32 chars");

        for (uint256 i = 0; i < s.length; i++) {
            uint8 c = uint8(s[i]);

            // Normalize A-Z to a-z
            if (c >= 65 && c <= 90) {
                c = c + 32;
                s[i] = bytes1(c);
            }

            bool isLower = (c >= 97 && c <= 122);
            bool isDigit = (c >= 48 && c <= 57);
            // Hyphen allowed only in the middle (not at edges)
            bool isDash = (c == 45 && i > 0 && i < s.length - 1);
            require(isLower || isDigit || isDash, "Invalid slug character");
        }

        norm = string(s);
        slugHash = keccak256(bytes(norm));
    }

    // =============================================================
    // ENS node derivation (hash-only, CCIP-Read compatible)
    // =============================================================
    function projectNode(uint256 projectId) public view returns (bytes32) {
        bytes32 sh = projects[projectId].slugHash;
        require(sh != bytes32(0), "Slug not set");
        return keccak256(abi.encodePacked(RWA_ID_ROOT_NODE, sh));
    }

    function nameNodeFromHash(
        uint256 projectId,
        bytes32 nameHash_
    ) public view returns (bytes32) {
        return keccak256(abi.encodePacked(projectNode(projectId), nameHash_));
    }

    /**
     * @notice Resolve ENS node to current address owner.
     * For soulbound tokens this is the original claimer.
     * For transferable tokens this reflects the current NFT owner.
     * Called by the CCIP-Read gateway to sign resolution responses.
     */
    function resolveAddr(bytes32 node) external view returns (address) {
        uint256 tokenId = nodeToTokenId[node];
        if (tokenId == 0) return address(0);
        return _ownerOf(tokenId);
    }

    // =============================================================
    // Protocol Admin (onlyOwner = multisig)
    // =============================================================
    function setProtocolTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        protocolTreasury = _treasury;
        emit ProtocolTreasuryUpdated(_treasury);
    }

    function setMinimumClaimFee(uint256 _fee) external onlyOwner {
        minimumClaimFee = _fee;
        emit MinimumFeeUpdated(_fee);
    }

    function setProtocolFeePercent(uint256 _percent) external onlyOwner {
        require(
            _percent >= MIN_PROTOCOL_FEE && _percent <= MAX_PROTOCOL_FEE,
            "Fee out of bounds"
        );
        protocolFeePercent = _percent;
        emit ProtocolFeeUpdated(_percent);
    }

    // =============================================================
    // Namespace Reservation (onlyOwner = multisig)
    // =============================================================

    /**
     * @notice Reserve a namespace for a specific address for `duration` seconds.
     * Use this to protect platforms during onboarding conversations.
     */
    function reserveNamespace(
        string calldata slug,
        address reservedFor,
        uint256 duration
    ) external onlyOwner {
        (string memory norm, bytes32 sh) = _validateAndNormalizeSlug(slug);
        require(projectIdBySlugHash[sh] == 0, "Already registered");
        reservedTo[sh] = reservedFor;
        reservationExpiry[sh] = block.timestamp + duration;
        emit NamespaceReserved(sh, norm, reservedFor, block.timestamp + duration);
    }

    function releaseNamespace(string calldata slug) external onlyOwner {
        (string memory norm, bytes32 sh) = _validateAndNormalizeSlug(slug);
        delete reservedTo[sh];
        delete reservationExpiry[sh];
        emit NamespaceReleased(sh, norm);
    }

    /**
     * @notice Batch reserve top RWA platform namespaces at deploy time.
     * Pass address(0x1) as placeholder for platforms not yet onboarded.
     */
    function batchReserveNamespaces(
        string[] calldata slugs,
        address[] calldata reservedAddresses,
        uint256 duration
    ) external onlyOwner {
        require(slugs.length == reservedAddresses.length, "Length mismatch");
        for (uint256 i = 0; i < slugs.length; i++) {
            (string memory norm, bytes32 sh) = _validateAndNormalizeSlug(slugs[i]);
            require(projectIdBySlugHash[sh] == 0, "Already registered");
            reservedTo[sh] = reservedAddresses[i];
            reservationExpiry[sh] = block.timestamp + duration;
            emit NamespaceReserved(sh, norm, reservedAddresses[i], block.timestamp + duration);
        }
    }

    // =============================================================
    // Project Creation (free)
    // =============================================================

    /**
     * @notice Create a new project namespace. Free — no ETH required.
     * @param slug      Unique identifier, e.g. "securitize" → securitize.rwa-id.eth
     * @param treasury_ Platform treasury address that receives 70% of claim fees
     * @param claimFee_ USDC claim fee (6 decimals). 0 = protocol minimum ($0.50) applies
     * @param transferable_ Whether identity tokens for this project can be transferred
     */
    function createProject(
        string calldata slug,
        address treasury_,
        uint256 claimFee_,
        bool transferable_
    ) external returns (uint256 projectId) {
        require(treasury_ != address(0), "Treasury required");

        (string memory norm, bytes32 sh) = _validateAndNormalizeSlug(slug);

        // Enforce namespace reservation
        address resAddr = reservedTo[sh];
        if (resAddr != address(0)) {
            if (block.timestamp < reservationExpiry[sh]) {
                require(msg.sender == resAddr, "Namespace reserved");
            } else {
                // Expired — clean up
                delete reservedTo[sh];
                delete reservationExpiry[sh];
            }
        }

        require(projectIdBySlugHash[sh] == 0, "Slug taken");

        projectId = nextProjectId++;
        projects[projectId] = Project({
            owner: msg.sender,
            slug: norm,
            slugHash: sh,
            treasury: treasury_,
            claimFee: claimFee_,
            transferable: transferable_,
            merkleRoot: bytes32(0),
            active: true,
            totalClaimed: 0,
            totalRevenue: 0
        });

        projectIdBySlugHash[sh] = projectId;
        emit ProjectCreated(projectId, norm, msg.sender, treasury_, claimFee_, transferable_);
    }

    // =============================================================
    // Project Management (onlyProjectOwner)
    // =============================================================
    modifier onlyProjectOwner(uint256 projectId) {
        require(projects[projectId].owner == msg.sender, "Not project owner");
        _;
    }

    function updateMerkleRoot(
        uint256 projectId,
        bytes32 newRoot,
        uint256 newTotalAllowlisted
    ) external onlyProjectOwner(projectId) {
        projects[projectId].merkleRoot = newRoot;
        emit MerkleRootUpdated(projectId, newRoot, newTotalAllowlisted);
    }

    function updateClaimFee(
        uint256 projectId,
        uint256 newFee
    ) external onlyProjectOwner(projectId) {
        projects[projectId].claimFee = newFee;
        emit ClaimFeeUpdated(projectId, newFee);
    }

    function updateTreasury(
        uint256 projectId,
        address newTreasury
    ) external onlyProjectOwner(projectId) {
        require(newTreasury != address(0), "Zero address");
        projects[projectId].treasury = newTreasury;
        emit TreasuryUpdated(projectId, newTreasury);
    }

    function setProjectTransferable(
        uint256 projectId,
        bool transferable_
    ) external onlyProjectOwner(projectId) {
        projects[projectId].transferable = transferable_;
        emit ProjectTransferabilityUpdated(projectId, transferable_);
    }

    /// @notice Override transferability on an already-minted token.
    function setTokenTransferable(
        uint256 tokenId,
        bool transferable_
    ) external {
        uint256 projectId = tokenMetadata[tokenId].projectId;
        require(projects[projectId].owner == msg.sender, "Not project owner");
        tokenTransferable[tokenId] = transferable_;
        emit TokenTransferabilityUpdated(tokenId, transferable_);
    }

    function pauseProject(uint256 projectId) external onlyProjectOwner(projectId) {
        projects[projectId].active = false;
        emit ProjectPaused(projectId);
    }

    function unpauseProject(uint256 projectId) external onlyProjectOwner(projectId) {
        projects[projectId].active = true;
        emit ProjectUnpaused(projectId);
    }

    function transferProjectOwnership(
        uint256 projectId,
        address newOwner
    ) external onlyProjectOwner(projectId) {
        require(newOwner != address(0), "Zero address");
        address old = projects[projectId].owner;
        projects[projectId].owner = newOwner;
        emit ProjectOwnershipTransferred(projectId, old, newOwner);
    }

    // =============================================================
    // Claim
    // =============================================================

    /**
     * @notice Claim an RWA ID. Caller must have approved the USDC spend first.
     *
     * Leaf = keccak256(abi.encodePacked(msg.sender, nameHash_))
     *
     * The claim mints an ERC-721 token and maps the ENS nameNode to that
     * tokenId so the CCIP-Read gateway can resolve the current owner.
     */
    function claim(
        uint256 projectId,
        bytes32 nameHash_,
        bytes32[] calldata proof
    ) external nonReentrant {
        Project storage project = projects[projectId];
        require(project.owner != address(0), "Project not found");
        require(project.active, "Project not active");
        require(!claimed[projectId][msg.sender], "Already claimed");
        require(!revoked[projectId][nameHash_], "Name revoked");

        // Verify Merkle proof — leaf = keccak256(abi.encodePacked(claimer, nameHash))
        bytes32 leaf_ = keccak256(abi.encodePacked(msg.sender, nameHash_));
        require(
            MerkleProof.verify(proof, project.merkleRoot, leaf_),
            "Invalid proof"
        );

        // Derive ENS node and ensure it is unclaimed
        bytes32 node = nameNodeFromHash(projectId, nameHash_);
        require(!nodeClaimed[node], "Node already claimed");

        // Determine effective USDC fee
        uint256 effectiveFee = project.claimFee > 0
            ? project.claimFee
            : minimumClaimFee;

        // Mark state before external calls (checks-effects-interactions)
        claimed[projectId][msg.sender] = true;
        nodeClaimed[node] = true;

        // Mint identity NFT
        uint256 tokenId = nextTokenId++;
        _mint(msg.sender, tokenId);

        tokenTransferable[tokenId] = project.transferable;
        tokenMetadata[tokenId] = IdentityMetadata({
            projectId: projectId,
            nameHash: nameHash_,
            claimedAt: block.timestamp
        });
        nodeToTokenId[node] = tokenId;

        // Update analytics
        project.totalClaimed++;
        project.totalRevenue += effectiveFee;

        // USDC split: requires prior approval from msg.sender
        uint256 protocolShare = (effectiveFee * protocolFeePercent) / 100;
        uint256 platformShare = effectiveFee - protocolShare; // no rounding dust

        usdc.safeTransferFrom(msg.sender, project.treasury, platformShare);
        usdc.safeTransferFrom(msg.sender, protocolTreasury, protocolShare);

        emit IdentityClaimed(projectId, nameHash_, msg.sender, tokenId, node, effectiveFee);
        emit FeeSplit(projectId, platformShare, protocolShare);
    }

    // =============================================================
    // Revocation
    // =============================================================

    /**
     * @notice Revoke an identity: burns the token, clears ENS mapping,
     *         and marks the nameHash as permanently revoked for this project.
     */
    function revokeIdentity(
        uint256 projectId,
        uint256 tokenId
    ) external onlyProjectOwner(projectId) {
        IdentityMetadata memory meta = tokenMetadata[tokenId];
        require(meta.projectId == projectId, "Wrong project");

        bytes32 nameHash_ = meta.nameHash;
        revoked[projectId][nameHash_] = true;

        // Clear ENS mapping so the gateway returns address(0)
        bytes32 node = nameNodeFromHash(projectId, nameHash_);
        delete nodeToTokenId[node];
        nodeClaimed[node] = false;

        _burn(tokenId);
        emit IdentityRevoked(projectId, nameHash_, tokenId);
    }

    // =============================================================
    // Soulbound enforcement (ERC-721 _update hook, OZ v5)
    // =============================================================
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == 0) and burning (to == 0) unconditionally.
        // Block transfers of soulbound tokens between non-zero addresses.
        if (from != address(0) && to != address(0)) {
            require(tokenTransferable[tokenId], "Soulbound: non-transferable");
        }

        return super._update(to, tokenId, auth);
    }
}
