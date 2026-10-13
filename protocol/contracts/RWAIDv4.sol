// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * RWA ID v4
 *
 * ENS-native identity registry on Robinhood Chain (chain id 4663).
 *
 * The ENS side does not move: rwa-id.eth, its wildcard resolver and the
 * CCIP-Read gateway's signer all stay on Ethereum mainnet. The resolver holds no
 * registry address and its signature does not commit to one, so pointing the
 * gateway at this contract is the whole cutover. Node derivation, the Merkle
 * leaf and the metadata renderer are unchanged from v3.
 *
 * Changes from v3:
 * - Fees are paid in a stablecoin chosen at deploy time (USDG on Robinhood
 *   Chain) rather than a hard-wired USDC.
 * - The minimum claim fee is a floor. v3 charged `claimFee` whenever it was
 *   non-zero, so a project could set a fee of one unit and pay the protocol
 *   nothing; the minimum only applied to a fee of exactly zero.
 * - Sponsorship. Anyone can pre-fund a project's sponsor pool; a claim draws
 *   its whole fee from the pool when the pool covers it, so the client pays
 *   nothing. The 70/30 split still runs, so a sponsoring platform's net cost
 *   is the protocol's share.
 * - claimFor(). The Merkle leaf already binds each name to its wallet, so any
 *   caller can submit a claim and the identity still lands with that wallet.
 *   A platform can issue to its whole allowlist and pay the gas itself.
 * - Labels and slugs follow ENS normalization (ENSIP-15). v3 accepted
 *   "a_b", "ab_" and "ab--cd", which mint but are rejected by every wallet's
 *   normalizer, so they could never resolve.
 * - projectUsage() exposes claim counts and protocol fees per project for the
 *   platform token unlock, which reads them on the same chain.
 * - Platform artwork. A project owner can set one image for every identity in
 *   the project, so its names show the platform's own art on marketplaces;
 *   without one they keep the onchain RWA·ID card.
 * - Ownable2Step, so handing the registry to a Safe cannot strand it on a typo.
 *
 * ENS node derivation (hash-only, compatible with v1 resolver):
 *   rootNode    = namehash("rwa-id.eth")
 *   projectNode = keccak256(abi.encodePacked(rootNode, slugHash))
 *   nameNode    = keccak256(abi.encodePacked(projectNode, nameHash))
 *
 * Claim leaf format:
 *   leaf = keccak256(abi.encodePacked(claimer, nameHash))
 */
contract RWAIDv4 is ERC721, Ownable2Step, ReentrancyGuard {
    using Strings for uint256;
    using SafeERC20 for IERC20;

    // namehash("rwa-id.eth") — same constant as v1 for ENS compatibility
    bytes32 public constant RWA_ID_ROOT_NODE =
        0xe560d9c28239bdc04a0064c1a6473ce3a69ac03d1a8a39daedbdf2296db4892f;

    // Stablecoin every fee is paid in (USDG on Robinhood Chain, 6 decimals)
    IERC20 public immutable paymentToken;

    // Protocol treasury (multisig)
    address public protocolTreasury;

    // ===== Fee Configuration =====
    uint256 public minimumClaimFee = 500_000;       // $0.50 (6 decimals). A floor, not a default
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
        uint256 claimFee;       // 6 decimals. Anything below minimumClaimFee is charged at the minimum
        bool transferable;      // default transferability for tokens minted in this project
        bytes32 merkleRoot;
        bool active;
        uint256 totalClaimed;
        uint256 totalRevenue;   // cumulative fees collected
    }

    mapping(uint256 => Project) public projects;
    mapping(bytes32 => uint256) public projectIdBySlugHash;

    // ===== Sponsorship =====
    // Kept outside the Project struct so projects() decodes exactly as it did on v3.
    mapping(uint256 => uint256) public sponsorBalance;
    // Sum of every sponsor pool: the only payment-token balance this contract
    // owes anyone. Anything above it can be rescued; nothing below it can.
    uint256 public totalSponsorBalance;

    // ===== Platform artwork =====
    // Optional per-project image (ipfs://, https:// or ar://). Empty = onchain card.
    mapping(uint256 => string) public projectImage;

    // ===== Usage =====
    mapping(uint256 => uint256) public protocolFeesPaid;

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
        // The plaintext label, kept so tokenURI() can render the real subdomain.
        // v2 stored only the hash, which is why its tokens were unnameable.
        string label;
    }

    mapping(uint256 => IdentityMetadata) public tokenMetadata;
    mapping(uint256 => bool) public tokenTransferable;

    // ===== Collection artwork overrides (optional) =====
    // When set, `baseURI` wins over the onchain renderer and tokenURI() returns
    // string.concat(baseURI, tokenId). Left empty, metadata stays fully onchain.
    string public baseURI;
    string private _contractURI;

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
        uint256 feePaid,
        // Plaintext label, so indexers and the console can show real names
        // instead of hashes without fetching the proof set.
        string label
    );
    // Separate from IdentityClaimed so that event keeps v3's signature and topic.
    event ClaimPaid(
        uint256 indexed projectId,
        uint256 indexed tokenId,
        address indexed payer,
        bool sponsored
    );
    event ProjectImageUpdated(uint256 indexed projectId, string uri);
    event SponsorshipFunded(uint256 indexed projectId, address indexed funder, uint256 amount);
    event SponsorshipWithdrawn(uint256 indexed projectId, address indexed to, uint256 amount);
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
    // ERC-4906: tells marketplaces to re-read metadata after an art change.
    event BatchMetadataUpdate(uint256 fromTokenId, uint256 toTokenId);
    event ContractURIUpdated();

    // =============================================================
    // Constructor
    // =============================================================
    constructor(
        address _paymentToken,
        address _multisig
    ) ERC721("RWA ID", "RWAID") Ownable(_multisig) {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_multisig != address(0), "Invalid multisig address");
        paymentToken = IERC20(_paymentToken);
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
        // ENSIP-15 rejects "--" in the third and fourth positions (reserved for
        // punycode-style extensions), which would make the whole namespace unresolvable.
        require(!(s[2] == "-" && s.length > 3 && s[3] == "-"), "Slug: -- at 3-4");

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

    /// @notice The fee a claim in this project costs: its own fee, never below the floor.
    function effectiveClaimFee(uint256 projectId) public view returns (uint256) {
        uint256 fee = projects[projectId].claimFee;
        return fee > minimumClaimFee ? fee : minimumClaimFee;
    }

    /**
     * @notice Usage figures for the platform token unlock.
     * @return owner        Current project owner (where unlocked tokens go)
     * @return totalClaimed Identities claimed, each one having paid at least the floor
     * @return protocolFees Cumulative protocol share collected from this project
     */
    function projectUsage(uint256 projectId)
        external
        view
        returns (address owner, uint256 totalClaimed, uint256 protocolFees)
    {
        Project storage p = projects[projectId];
        return (p.owner, p.totalClaimed, protocolFeesPaid[projectId]);
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
     * @param claimFee_ Claim fee (6 decimals). Anything below the protocol minimum ($0.50) is charged at the minimum
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

    /**
     * @notice Set the image every identity in this project shows on marketplaces.
     *         Pass an empty string to go back to the onchain RWA·ID card.
     * @dev The URI is interpolated into tokenURI()'s JSON, so it is restricted to
     *      ipfs://, https:// or ar:// and to printable ASCII without quotes,
     *      backslashes or angle brackets — nothing that could close the string
     *      and forge other metadata fields.
     */
    function setProjectImage(
        uint256 projectId,
        string calldata uri
    ) external onlyProjectOwner(projectId) {
        bytes calldata b = bytes(uri);
        if (b.length > 0) {
            require(b.length <= 512, "Image: max 512 chars");
            require(
                _hasPrefix(b, "ipfs://") || _hasPrefix(b, "https://") || _hasPrefix(b, "ar://"),
                "Image: ipfs, https or ar"
            );
            for (uint256 i = 0; i < b.length; i++) {
                bytes1 c = b[i];
                require(
                    c > 0x20 && c < 0x7F && c != '"' && c != "\\" && c != "<" && c != ">",
                    "Image: invalid character"
                );
            }
        }
        projectImage[projectId] = uri;
        emit ProjectImageUpdated(projectId, uri);
        // ERC-4906: marketplaces re-read metadata. Token ids interleave across
        // projects, so the whole range is the only accurate one to announce.
        emit BatchMetadataUpdate(1, type(uint256).max);
    }

    function _hasPrefix(bytes calldata b, bytes memory prefix) internal pure returns (bool) {
        if (b.length < prefix.length) return false;
        for (uint256 i = 0; i < prefix.length; i++) {
            if (b[i] != prefix[i]) return false;
        }
        return true;
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
    // Sponsorship
    // =============================================================

    /**
     * @notice Pre-pay claim fees for a project. Anyone can fund any project's
     *         pool; only the project owner can withdraw from it.
     */
    function fundSponsorship(uint256 projectId, uint256 amount) external nonReentrant {
        require(projects[projectId].owner != address(0), "Project not found");
        require(amount > 0, "Zero amount");
        sponsorBalance[projectId] += amount;
        totalSponsorBalance += amount;
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        emit SponsorshipFunded(projectId, msg.sender, amount);
    }

    function withdrawSponsorship(
        uint256 projectId,
        uint256 amount,
        address to
    ) external onlyProjectOwner(projectId) nonReentrant {
        require(to != address(0), "Zero address");
        require(amount <= sponsorBalance[projectId], "Exceeds sponsor balance");
        sponsorBalance[projectId] -= amount;
        totalSponsorBalance -= amount;
        paymentToken.safeTransfer(to, amount);
        emit SponsorshipWithdrawn(projectId, to, amount);
    }

    /**
     * @notice Recover tokens sent here by mistake. Sponsor pools are excluded:
     *         for the payment token only the balance above totalSponsorBalance moves.
     */
    function rescueToken(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Zero address");
        if (token == address(paymentToken)) {
            uint256 free = paymentToken.balanceOf(address(this)) - totalSponsorBalance;
            require(amount <= free, "Sponsor funds are not rescuable");
        }
        IERC20(token).safeTransfer(to, amount);
    }

    // =============================================================
    // Claim
    // =============================================================

    /**
     * @notice Claim an allowlisted identity for yourself.
     * @param label The plaintext label being claimed, e.g. "alice" for
     *        alice.acme.rwa-id.eth. The leaf is keccak256(claimer, keccak256(label)),
     *        byte-identical to v2 and v3.
     *
     * When the project's sponsor pool covers the fee, the pool pays it. Otherwise
     * the caller pays and must have approved the payment token first.
     */
    function claim(
        uint256 projectId,
        string calldata label,
        bytes32[] calldata proof
    ) external nonReentrant {
        _claim(projectId, msg.sender, label, proof);
    }

    /**
     * @notice Claim an allowlisted identity on a wallet's behalf.
     *
     * The token always mints to `claimer`, because the proof is for the pair
     * (claimer, label) and nothing else — a caller can only deliver an identity
     * the allowlist already gave that wallet. Fees come from the sponsor pool
     * when it covers them, otherwise from the caller.
     */
    function claimFor(
        uint256 projectId,
        address claimer,
        string calldata label,
        bytes32[] calldata proof
    ) external nonReentrant {
        require(claimer != address(0), "Zero address");
        _claim(projectId, claimer, label, proof);
    }

    function _claim(
        uint256 projectId,
        address claimer,
        string calldata label,
        bytes32[] calldata proof
    ) internal {
        bytes32 nameHash_ = _validateLabel(label);

        Project storage project = projects[projectId];
        require(project.owner != address(0), "Project not found");
        require(project.active, "Project not active");
        require(!claimed[projectId][claimer], "Already claimed");
        require(!revoked[projectId][nameHash_], "Name revoked");

        // Verify Merkle proof — leaf = keccak256(abi.encodePacked(claimer, nameHash))
        require(
            MerkleProof.verify(
                proof,
                project.merkleRoot,
                keccak256(abi.encodePacked(claimer, nameHash_))
            ),
            "Invalid proof"
        );

        // Derive ENS node and ensure it is unclaimed
        bytes32 node = nameNodeFromHash(projectId, nameHash_);
        require(!nodeClaimed[node], "Node already claimed");

        uint256 effectiveFee = effectiveClaimFee(projectId);

        // Mark state before external calls (checks-effects-interactions)
        claimed[projectId][claimer] = true;
        nodeClaimed[node] = true;

        // Mint identity NFT
        uint256 tokenId = nextTokenId++;
        _mint(claimer, tokenId);

        tokenTransferable[tokenId] = project.transferable;
        tokenMetadata[tokenId] = IdentityMetadata({
            projectId: projectId,
            nameHash: nameHash_,
            claimedAt: block.timestamp,
            label: label
        });
        nodeToTokenId[node] = tokenId;

        // Update analytics
        project.totalClaimed++;
        project.totalRevenue += effectiveFee;

        emit IdentityClaimed(projectId, nameHash_, claimer, tokenId, node, effectiveFee, label);

        _collectFee(projectId, project.treasury, tokenId, effectiveFee);
    }

    /**
     * @dev Splits the fee 70/30 (or the current protocol percent). A sponsor pool
     *      that covers the whole fee pays it; a partially funded pool is left
     *      alone rather than split across two payers.
     */
    function _collectFee(
        uint256 projectId,
        address platformTreasury,
        uint256 tokenId,
        uint256 fee
    ) internal {
        uint256 protocolShare = (fee * protocolFeePercent) / 100;
        uint256 platformShare = fee - protocolShare; // no rounding dust
        protocolFeesPaid[projectId] += protocolShare;

        bool sponsored = sponsorBalance[projectId] >= fee;
        if (sponsored) {
            sponsorBalance[projectId] -= fee;
            totalSponsorBalance -= fee;
            paymentToken.safeTransfer(platformTreasury, platformShare);
            paymentToken.safeTransfer(protocolTreasury, protocolShare);
        } else {
            paymentToken.safeTransferFrom(msg.sender, platformTreasury, platformShare);
            paymentToken.safeTransferFrom(msg.sender, protocolTreasury, protocolShare);
        }

        emit ClaimPaid(projectId, tokenId, sponsored ? address(this) : msg.sender, sponsored);
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
    // Label validation
    // =============================================================

    /**
     * @dev Labels are hashed exactly as given — never normalized — because the
     *      Merkle leaf is built from the raw string offchain, so rewriting the
     *      bytes here would break proof verification. Anything a wallet's ENS
     *      normalizer would change or reject is therefore *rejected* here, so
     *      the allowlist, the mint and ENS resolution agree by construction:
     *
     *      - uppercase: the gateway lowercases before hashing, so "Zac" minted
     *        at keccak("Zac") while ENS looked up keccak("zac") (the v2 bug);
     *      - "_" after any other character: ENSIP-15 allows underscores only as
     *        a leading run, so "a_b" mints and then fails normalize() everywhere
     *        (accepted by v3);
     *      - "--" in positions 3 and 4: reserved by ENSIP-15 for label
     *        extensions, so "ab--cd" fails the same way (accepted by v3).
     *
     *      Restricting to [a-z0-9-_] also keeps the renderer safe: tokenURI()
     *      interpolates the label into JSON and into SVG, so a quote, angle
     *      bracket or ampersand could otherwise forge metadata or inject markup.
     */
    function _validateLabel(string calldata label) internal pure returns (bytes32) {
        bytes calldata b = bytes(label);
        require(b.length > 0 && b.length <= 63, "Label: 1-63 chars");

        bool pastLeadingUnderscores = false;
        for (uint256 i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            bool isLower = c >= 0x61 && c <= 0x7A; // a-z
            bool isDigit = c >= 0x30 && c <= 0x39; // 0-9
            bool isHyphen = c == 0x2D;             // -
            bool isUnderscore = c == 0x5F;         // _
            require(isLower || isDigit || isHyphen || isUnderscore, "Label: lowercase a-z 0-9 - _");

            if (isUnderscore) {
                require(!pastLeadingUnderscores, "Label: _ only at start");
            } else {
                pastLeadingUnderscores = true;
            }
        }
        require(!(b.length >= 4 && b[2] == "-" && b[3] == "-"), "Label: -- at 3-4");
        return keccak256(b);
    }

    // =============================================================
    // Metadata
    // =============================================================

    /// @notice The full ENS name for a token, e.g. "alice.acme.rwa-id.eth".
    function fullName(uint256 tokenId) public view returns (string memory) {
        _requireOwned(tokenId);
        IdentityMetadata memory meta = tokenMetadata[tokenId];
        return string.concat(meta.label, ".", projects[meta.projectId].slug, ".rwa-id.eth");
    }

    /// @notice Point tokenURI at an offchain collection. Empty restores onchain art.
    function setBaseURI(string calldata uri) external onlyOwner {
        baseURI = uri;
        emit BatchMetadataUpdate(1, type(uint256).max);
    }

    /// @notice Collection-level metadata for marketplaces.
    function setContractURI(string calldata uri) external onlyOwner {
        _contractURI = uri;
        emit ContractURIUpdated();
    }

    function contractURI() external view returns (string memory) {
        if (bytes(_contractURI).length > 0) return _contractURI;

        return _jsonURI(
            string.concat(
                '{"name":"RWA ID",',
                '"description":"ENS-native identity for tokenized real-world asset platforms. ',
                'Each token is a claimed subdomain of rwa-id.eth, issued by a verified project.",',
                '"image":"', _svgURI("rwa-id", ".eth"), '",',
                '"external_link":"https://rwa-id.com"}'
            )
        );
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        if (bytes(baseURI).length > 0) {
            return string.concat(baseURI, tokenId.toString());
        }

        IdentityMetadata memory meta = tokenMetadata[tokenId];
        Project memory project = projects[meta.projectId];
        string memory name_ = string.concat(meta.label, ".", project.slug, ".rwa-id.eth");
        string memory image = projectImage[meta.projectId];
        if (bytes(image).length == 0) image = _svgURI(meta.label, string.concat(".", project.slug, ".rwa-id.eth"));

        return _jsonURI(
            string.concat(
                '{"name":"', name_, '",',
                '"description":"', name_, ' is an ENS identity issued by ', project.slug,
                ' on RWA ID. It resolves onchain to the wallet that holds this token.",',
                '"image":"', image, '",',
                '"external_url":"https://rwa-id.com",',
                '"attributes":[',
                    '{"trait_type":"Namespace","value":"', project.slug, '.rwa-id.eth"},',
                    '{"trait_type":"Label","value":"', meta.label, '"},',
                    '{"trait_type":"Project ID","value":', meta.projectId.toString(), '},',
                    '{"trait_type":"Transferability","value":"',
                        tokenTransferable[tokenId] ? "Transferable" : "Soulbound", '"},',
                    '{"display_type":"date","trait_type":"Claimed","value":',
                        meta.claimedAt.toString(), '}',
                ']}'
            )
        );
    }

    /// @dev Adds ERC-4906 (metadata update) to the standard ERC-721 interfaces.
    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return interfaceId == bytes4(0x49064906) || super.supportsInterface(interfaceId);
    }

    // ===== Renderer =====

    function _jsonURI(string memory json) internal pure returns (string memory) {
        return string.concat(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        );
    }

    /**
     * @dev The card: the RWA·ID "R" mark over the console's dark shell, with the
     *      full name set beneath it. Every identity carries the same mark so the
     *      collection reads as one brand on a marketplace grid; the name is what
     *      distinguishes them. Labels are restricted to printable ASCII by
     *      _validateLabel, so nothing here can break out of the SVG or the JSON.
     */
    /**
     * The default artwork: the RWA ID identity card. Ink field, the lime 2c
     * "cut-corner tag" mark, lime/orange rings, the label in white over the
     * namespace in lime, and a lime bar along the bottom edge. Two text lines,
     * each sized to its own length, so a 63-character label still fits.
     */
    function _svgURI(string memory label, string memory suffix) internal pure returns (string memory) {
        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">',
            '<rect width="800" height="800" fill="#0B0C0A"/>',
            '<g fill="none"><circle cx="800" cy="0" r="300" stroke="#CCFF00" stroke-opacity=".38"/>',
            '<circle cx="800" cy="0" r="200" stroke="#FF5A1F" stroke-opacity=".45"/></g>',
            '<clipPath id="c"><path d="M64 64h74l46 44v66H64z"/></clipPath>',
            '<rect x="64" y="64" width="120" height="110" rx="29" fill="#CCFF00" clip-path="url(#c)"/>',
            '<rect x="148" y="64" width="36" height="36" rx="10" fill="#FF5A1F"/>',
            '<circle cx="99" cy="99" r="13" fill="#0B0C0A"/><rect x="87" y="132" width="50" height="10" rx="3" fill="#0B0C0A"/>',
            '<g font-family="Archivo,Helvetica,Arial,sans-serif" font-weight="800" letter-spacing="-1">',
            '<text x="64" y="560" font-size="', _fit(bytes(label).length), '" fill="#FFF">', label, '</text>',
            '<text x="64" y="640" font-size="', _fit(bytes(suffix).length + 8), '" fill="#CCFF00">', suffix, '</text></g>',
            '<text x="64" y="712" font-family="monospace" font-size="20" letter-spacing="3" fill="#A3A69C">',
            'RWA ID &#183; ROBINHOOD CHAIN</text>',
            '<rect y="776" width="800" height="24" fill="#CCFF00"/></svg>'
        );

        return string.concat("data:image/svg+xml;base64,", Base64.encode(bytes(svg)));
    }

    /// Font size that keeps `len` bold characters inside the card's 672px text width.
    function _fit(uint256 len) internal pure returns (string memory) {
        if (len <= 12) return "72";
        if (len <= 20) return "52";
        if (len <= 32) return "34";
        if (len <= 44) return "26";
        return "18";
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
