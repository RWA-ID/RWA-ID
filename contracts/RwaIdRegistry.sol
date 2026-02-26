// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * RwaIdRegistry (ENS-native, hash-only)
 *
 * - No user name strings stored on-chain
 * - Deterministic subdomains under rwa-id.eth via ENS namehash rules
 * - Claims are Merkle allowlisted: leaf = keccak256(abi.encodePacked(user, nameHash))
 * - One identity per user per project per badgeType
 * - One owner per nameHash per project (prevents duplicates)
 *
 * ENS-native state on Linea:
 * - nodeAddr[nameNode] = owner
 * - nodeClaimed[nameNode] = true
 *
 * Node derivation (hash-only, ENS-compatible):
 * - rootNode = namehash("rwa-id.eth") (constant)
 * - projectNode = keccak256(abi.encodePacked(rootNode, slugHash))
 * - nameNode    = keccak256(abi.encodePacked(projectNode, nameHash))
 *
 * Where:
 * - slugHash  = keccak256(bytes(normalizedSlug))
 * - nameHash  = keccak256(bytes(normalizedLabel)) (UI policy; recommend lowercase)
 */
contract RwaIdRegistry is Ownable, Pausable {
    // namehash("rwa-id.eth") on Ethereum mainnet
    bytes32 public constant RWA_ID_ROOT_NODE =
        0xe560d9c28239bdc04a0064c1a6473ce3a69ac03d1a8a39daedbdf2296db4892f;

    // ENS node => resolved address
    mapping(bytes32 => address) public nodeAddr;
    mapping(bytes32 => bool) public nodeClaimed;

    // ===== Platform Config =====
    address public treasury;
    uint256 public projectFeeWei;

    // ===== Project Data =====
    struct Project {
        address admin;
        bool active;
        bool soulbound; // kept for policy, even though there's no NFT transfer
        bytes32 slugHash; // ENS labelhash for slug
        string slug;      // optional for UI; not required for resolution
        string baseURI;   // optional for UI metadata endpoints
    }

    uint256 public nextProjectId = 1;
    mapping(uint256 => Project) public projects;

    // keccak256(lowercaseSlug) => projectId (0 means unassigned)
    mapping(bytes32 => uint256) public projectIdBySlugHash;

    // ===== Allowlist Roots =====
    // projectId => badgeType => merkleRoot
    mapping(uint256 => mapping(bytes32 => bytes32)) public allowlistRoot;
    mapping(uint256 => mapping(bytes32 => uint64)) public allowlistValidFrom;
    mapping(uint256 => mapping(bytes32 => uint64)) public allowlistValidTo;

    // ===== Claim state =====
    // projectId => badgeType => address => claimed?
    mapping(uint256 => mapping(bytes32 => mapping(address => bool))) public hasClaimed;

    // projectId => nameHash => owner (prevents duplicates)
    mapping(uint256 => mapping(bytes32 => address)) public nameOwner;

    // ===== Events =====
    event ProjectCreated(uint256 indexed projectId, address indexed admin, bool soulbound, string slug, bytes32 slugHash, string baseURI);
    event ProjectUpdated(uint256 indexed projectId, address indexed admin, bool active, bool soulbound, string baseURI);

    event AllowlistRootSet(uint256 indexed projectId, bytes32 indexed badgeType, bytes32 merkleRoot, uint64 validFrom, uint64 validTo);

    event Claimed(
        uint256 indexed projectId,
        bytes32 indexed badgeType,
        address indexed owner,
        bytes32 nameHash,
        bytes32 node
    );

    constructor(address treasury_, uint256 projectFeeWei_) Ownable(msg.sender) {
        treasury = treasury_;
        projectFeeWei = projectFeeWei_;
    }

    // =============================================================
    // Admin
    // =============================================================
    function setTreasury(address t) external onlyOwner {
        require(t != address(0), "treasury=0");
        treasury = t;
    }

    function setProjectFee(uint256 feeWei) external onlyOwner {
        projectFeeWei = feeWei;
    }

    function withdraw() external onlyOwner {
        address t = treasury;
        require(t != address(0), "treasury=0");
        (bool ok,) = t.call{value: address(this).balance}("");
        require(ok, "withdraw failed");
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // =============================================================
    // Slug helpers
    // =============================================================
    function _normalizeAndValidateSlug(string memory slug) internal pure returns (string memory out, bytes32 slugHash) {
        bytes memory s = bytes(slug);
        require(s.length >= 3 && s.length <= 32, "slug length 3-32");

        for (uint256 i = 0; i < s.length; i++) {
            uint8 c = uint8(s[i]);

            // A-Z -> a-z
            if (c >= 65 && c <= 90) {
                c = c + 32;
                s[i] = bytes1(c);
            }

            bool isLower = (c >= 97 && c <= 122);
            bool isDigit = (c >= 48 && c <= 57);
            bool isDash  = (c == 45);
            require(isLower || isDigit || isDash, "slug chars a-z0-9-");
        }

        require(s[0] != 0x2d && s[s.length - 1] != 0x2d, "slug dash edge");

        out = string(s);
        slugHash = keccak256(bytes(out));
    }

    modifier onlyProjectAdmin(uint256 projectId) {
        require(projects[projectId].admin == msg.sender, "not project admin");
        _;
    }

    // =============================================================
    // ENS node derivation (hash-only)
    // =============================================================
    function projectNode(uint256 projectId) public view returns (bytes32) {
        bytes32 sh = projects[projectId].slugHash;
        require(sh != bytes32(0), "slug not set");
        return keccak256(abi.encodePacked(RWA_ID_ROOT_NODE, sh));
    }

    function nameNodeFromHash(uint256 projectId, bytes32 nameHash) public view returns (bytes32) {
        return keccak256(abi.encodePacked(projectNode(projectId), nameHash));
    }

    function resolveAddr(bytes32 node) external view returns (address) {
        return nodeAddr[node];
    }

    // =============================================================
    // Project creation / update
    // =============================================================
    function _createProjectInternal(address admin, bool soulbound, string calldata baseURI_)
        internal
        returns (uint256 projectId)
    {
        require(admin != address(0), "admin=0");
        if (projectFeeWei != 0) {
            require(msg.value >= projectFeeWei, "fee");
        }

        projectId = nextProjectId++;
        projects[projectId] = Project({
            admin: admin,
            active: true,
            soulbound: soulbound,
            slugHash: bytes32(0),
            slug: "",
            baseURI: baseURI_
        });

        // forward fee (optional)
        if (projectFeeWei != 0 && treasury != address(0)) {
            (bool ok,) = treasury.call{value: msg.value}("");
            require(ok, "fee xfer failed");
        }
    }

    function createProjectWithSlug(string calldata slug, bool soulbound, string calldata baseURI_)
        external
        payable
        whenNotPaused
        returns (uint256 projectId)
    {
        (string memory norm, bytes32 sh) = _normalizeAndValidateSlug(slug);
        require(projectIdBySlugHash[sh] == 0, "slug taken");

        projectId = _createProjectInternal(msg.sender, soulbound, baseURI_);

        projects[projectId].slugHash = sh;
        projects[projectId].slug = norm;
        projectIdBySlugHash[sh] = projectId;

        emit ProjectCreated(projectId, msg.sender, soulbound, norm, sh, baseURI_);
    }

    function updateProject(
        uint256 projectId,
        address admin,
        bool active,
        bool soulbound,
        string calldata baseURI_
    ) external whenNotPaused onlyProjectAdmin(projectId) {
        require(admin != address(0), "admin=0");

        projects[projectId].admin = admin;
        projects[projectId].active = active;
        projects[projectId].soulbound = soulbound;
        projects[projectId].baseURI = baseURI_;

        emit ProjectUpdated(projectId, admin, active, soulbound, baseURI_);
    }

    // =============================================================
    // Allowlist
    // =============================================================
    function _isAllowlistWindowOpen(uint256 projectId, bytes32 badgeType) internal view returns (bool) {
        uint64 vf = allowlistValidFrom[projectId][badgeType];
        uint64 vt = allowlistValidTo[projectId][badgeType];
        if (vf != 0 && block.timestamp < vf) return false;
        if (vt != 0 && block.timestamp > vt) return false;
        return true;
    }

    function _leaf(address recipient, bytes32 nameHash) internal pure returns (bytes32) {
        // leaf = keccak256(abi.encodePacked(recipient, nameHash))
        return keccak256(abi.encodePacked(recipient, nameHash));
    }

    function isAllowlisted(
        uint256 projectId,
        bytes32 badgeType,
        address recipient,
        bytes32 nameHash,
        bytes32[] calldata proof
    ) public view returns (bool) {
        if (!_isAllowlistWindowOpen(projectId, badgeType)) return false;

        bytes32 root = allowlistRoot[projectId][badgeType];
        if (root == bytes32(0)) return false;

        return MerkleProof.verify(proof, root, _leaf(recipient, nameHash));
    }

    function setAllowlistRootForBadge(
        uint256 projectId,
        bytes32 badgeType,
        bytes32 root,
        uint64 validFrom,
        uint64 validTo
    ) external whenNotPaused onlyProjectAdmin(projectId) {
        allowlistRoot[projectId][badgeType] = root;
        allowlistValidFrom[projectId][badgeType] = validFrom;
        allowlistValidTo[projectId][badgeType] = validTo;

        emit AllowlistRootSet(projectId, badgeType, root, validFrom, validTo);
    }

    // =============================================================
    // Claim (hash-only)
    // =============================================================
    function claimSoulbound(
        uint256 projectId,
        bytes32 badgeType,
        bytes32 nameHash,
        bytes32[] calldata proof
    ) external whenNotPaused {
        _claimTo(projectId, badgeType, msg.sender, nameHash, proof);
    }

    function claimFor(
        uint256 projectId,
        bytes32 badgeType,
        address recipient,
        bytes32 nameHash,
        bytes32[] calldata proof
    ) external whenNotPaused {
        _claimTo(projectId, badgeType, recipient, nameHash, proof);
    }

    function _claimTo(
        uint256 projectId,
        bytes32 badgeType,
        address recipient,
        bytes32 nameHash,
        bytes32[] calldata proof
    ) internal {
        Project memory p = projects[projectId];
        require(p.admin != address(0), "project missing");
        require(p.active, "project inactive");
        require(recipient != address(0), "recipient=0");

        require(!hasClaimed[projectId][badgeType][recipient], "already claimed");
        require(nameOwner[projectId][nameHash] == address(0), "name taken");

        require(isAllowlisted(projectId, badgeType, recipient, nameHash, proof), "not allowlisted");

        // Derive ENS node hash-only
        bytes32 node = nameNodeFromHash(projectId, nameHash);
        require(!nodeClaimed[node], "node already claimed");

        // Persist ENS-native resolution state
        nodeAddr[node] = recipient;
        nodeClaimed[node] = true;

        // Persist identity ownership/dedupe state
        hasClaimed[projectId][badgeType][recipient] = true;
        nameOwner[projectId][nameHash] = recipient;

        emit Claimed(projectId, badgeType, recipient, nameHash, node);
    }

    receive() external payable {}
}

