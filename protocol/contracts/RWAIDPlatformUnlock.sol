// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @dev The two RWAIDv4 reads this contract needs. Same chain, so no oracle.
interface IRWAIDUsage {
    function projectIdBySlugHash(bytes32 slugHash) external view returns (uint256);

    function projectUsage(uint256 projectId)
        external
        view
        returns (address owner, uint256 totalClaimed, uint256 protocolFees);
}

/**
 * RWA ID platform token unlock
 *
 * Holds the token allocation reserved for platforms, one bucket per reserved
 * namespace (securitize, ondo, robinhood, ...). A bucket is earned by usage
 * and released over time, and it always pays the namespace's current project
 * owner on the registry.
 *
 * Lifecycle of a bucket:
 *   1. addBuckets()  — the owner (Safe) creates it. The contract must already
 *                      hold enough tokens to cover every bucket it has promised.
 *   2. activate()    — the owner starts it once the real company has been
 *                      verified and has created the project for that slug.
 *                      Activation is manual on purpose: a namespace reservation
 *                      on the registry can lapse, after which anyone could
 *                      register the slug. Only the Safe decides who is real.
 *   3. release()     — anyone can call it; tokens go to the project owner.
 *
 * How much is releasable at any moment is the smaller of two curves:
 *   earned   = amount × min(claims since activation, claimsForFullUnlock) / claimsForFullUnlock
 *   timeCap  = amount × min(time since activation, releaseDuration) / releaseDuration
 *
 * Usage decides whether a platform gets its tokens at all; time limits how fast.
 * Claims are counted from the registry's totalClaimed, and every v4 claim pays at
 * least the minimum fee, so manufacturing usage has a real cost — and the time
 * cap bounds what any amount of manufactured usage can extract per month.
 *
 * Two exits, both owner-only and both visible on-chain:
 *   - cancel():  for an activated bucket. Whatever the platform has earned so far
 *                stays theirs and keeps releasing on the time curve; only the
 *                unearned remainder is returned.
 *   - sweep():   for a bucket nobody activated by activationDeadline. Returns it
 *                whole, e.g. to the open platform pool.
 */
contract RWAIDPlatformUnlock is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    IRWAIDUsage public immutable registry;

    /// Claims after activation at which a bucket is fully earned.
    uint256 public immutable claimsForFullUnlock;
    /// Seconds from activation until the time cap reaches the whole bucket.
    uint256 public immutable releaseDuration;
    /// Last moment a bucket can be activated; after it, unactivated buckets can be swept.
    uint256 public immutable activationDeadline;

    struct Bucket {
        string slug;
        uint256 amount;          // the allocation
        uint256 released;        // paid out so far
        uint256 projectId;       // 0 until activated
        uint256 activatedAt;
        uint256 baselineClaims;  // registry totalClaimed at activation; earlier claims don't count
        bool cancelled;
        uint256 earnedAtCancel;  // frozen earned amount once cancelled
    }

    mapping(bytes32 => Bucket) public buckets;
    bytes32[] public bucketIds;

    /// Tokens still owed across all buckets. The contract's balance never drops below it.
    uint256 public totalCommitted;

    event BucketAdded(bytes32 indexed slugHash, string slug, uint256 amount);
    event BucketActivated(bytes32 indexed slugHash, uint256 indexed projectId, uint256 baselineClaims);
    event Released(bytes32 indexed slugHash, address indexed to, uint256 amount);
    event BucketCancelled(bytes32 indexed slugHash, uint256 earnedKept, uint256 refunded, address to);
    event BucketSwept(bytes32 indexed slugHash, uint256 amount, address to);
    event ExcessRecovered(address indexed to, uint256 amount);

    constructor(
        address token_,
        address registry_,
        address owner_,
        uint256 claimsForFullUnlock_,
        uint256 releaseDuration_,
        uint256 activationDeadline_
    ) Ownable(owner_) {
        require(token_ != address(0) && registry_ != address(0), "Zero address");
        require(claimsForFullUnlock_ > 0, "Zero claims target");
        require(releaseDuration_ > 0, "Zero duration");
        require(activationDeadline_ > block.timestamp, "Deadline in the past");
        token = IERC20(token_);
        registry = IRWAIDUsage(registry_);
        claimsForFullUnlock = claimsForFullUnlock_;
        releaseDuration = releaseDuration_;
        activationDeadline = activationDeadline_;
    }

    // =============================================================
    // Setup (owner)
    // =============================================================

    /**
     * @notice Create one bucket per slug. Fund the contract first: the call
     *         reverts unless the balance covers every promise made so far.
     * @param slugs Lowercase slugs exactly as the registry stores them.
     */
    function addBuckets(string[] calldata slugs, uint256[] calldata amounts) external onlyOwner {
        require(slugs.length == amounts.length, "Length mismatch");
        require(block.timestamp <= activationDeadline, "Past activation deadline");

        for (uint256 i = 0; i < slugs.length; i++) {
            bytes32 h = _slugHash(slugs[i]);
            require(buckets[h].amount == 0 && bytes(buckets[h].slug).length == 0, "Bucket exists");
            require(amounts[i] > 0, "Zero amount");

            buckets[h].slug = slugs[i];
            buckets[h].amount = amounts[i];
            bucketIds.push(h);
            totalCommitted += amounts[i];
            emit BucketAdded(h, slugs[i], amounts[i]);
        }
        require(token.balanceOf(address(this)) >= totalCommitted, "Unfunded");
    }

    /**
     * @notice Start a bucket once the namespace's real owner has created its project.
     *         Claims made before this moment do not count toward the unlock.
     */
    function activate(string calldata slug) external onlyOwner {
        bytes32 h = keccak256(bytes(slug));
        Bucket storage b = buckets[h];
        require(b.amount > 0, "No bucket");
        require(b.projectId == 0, "Already active");
        require(!b.cancelled, "Cancelled");
        require(block.timestamp <= activationDeadline, "Past activation deadline");

        uint256 projectId = registry.projectIdBySlugHash(h);
        require(projectId != 0, "Project not created");
        (, uint256 claims, ) = registry.projectUsage(projectId);

        b.projectId = projectId;
        b.activatedAt = block.timestamp;
        b.baselineClaims = claims;
        emit BucketActivated(h, projectId, claims);
    }

    // =============================================================
    // Release (anyone)
    // =============================================================

    /// @notice Pay a bucket's releasable tokens to the project's current owner.
    function release(string calldata slug) external nonReentrant returns (uint256 amount) {
        bytes32 h = keccak256(bytes(slug));
        amount = releasable(h);
        require(amount > 0, "Nothing to release");

        Bucket storage b = buckets[h];
        b.released += amount;
        totalCommitted -= amount;

        (address owner_, , ) = registry.projectUsage(b.projectId);
        token.safeTransfer(owner_, amount);
        emit Released(h, owner_, amount);
    }

    // =============================================================
    // Exits (owner)
    // =============================================================

    /**
     * @notice Stop an activated bucket. What the platform earned so far stays
     *         theirs and keeps releasing on the time curve; the rest is returned.
     */
    function cancel(string calldata slug, address to) external onlyOwner nonReentrant {
        require(to != address(0), "Zero address");
        bytes32 h = keccak256(bytes(slug));
        Bucket storage b = buckets[h];
        require(b.projectId != 0, "Not active");
        require(!b.cancelled, "Cancelled");

        uint256 kept = earned(h);
        uint256 refund = b.amount - kept;
        b.cancelled = true;
        b.earnedAtCancel = kept;
        totalCommitted -= refund;

        if (refund > 0) token.safeTransfer(to, refund);
        emit BucketCancelled(h, kept, refund, to);
    }

    /// @notice Return a bucket nobody activated before the deadline.
    function sweep(string calldata slug, address to) external onlyOwner nonReentrant {
        require(to != address(0), "Zero address");
        require(block.timestamp > activationDeadline, "Before activation deadline");
        bytes32 h = keccak256(bytes(slug));
        Bucket storage b = buckets[h];
        require(b.amount > 0, "No bucket");
        require(b.projectId == 0, "Activated");
        require(!b.cancelled, "Cancelled");

        uint256 amount = b.amount;
        b.cancelled = true;
        totalCommitted -= amount;

        token.safeTransfer(to, amount);
        emit BucketSwept(h, amount, to);
    }

    /// @notice Move tokens above what the buckets owe, e.g. a mistaken over-funding.
    function recoverExcess(address to) external onlyOwner nonReentrant {
        require(to != address(0), "Zero address");
        uint256 excess = token.balanceOf(address(this)) - totalCommitted;
        require(excess > 0, "No excess");
        token.safeTransfer(to, excess);
        emit ExcessRecovered(to, excess);
    }

    // =============================================================
    // Views
    // =============================================================

    /// @notice Tokens a bucket has earned through usage (ignores the time cap).
    function earned(bytes32 slugHash) public view returns (uint256) {
        Bucket storage b = buckets[slugHash];
        if (b.cancelled) return b.earnedAtCancel;
        if (b.projectId == 0) return 0;

        (, uint256 claims, ) = registry.projectUsage(b.projectId);
        uint256 counted = claims > b.baselineClaims ? claims - b.baselineClaims : 0;
        return Math.mulDiv(b.amount, Math.min(counted, claimsForFullUnlock), claimsForFullUnlock);
    }

    /// @notice The most a bucket may have released by now, regardless of usage.
    function timeCap(bytes32 slugHash) public view returns (uint256) {
        Bucket storage b = buckets[slugHash];
        if (b.projectId == 0) return 0;
        uint256 elapsed = block.timestamp - b.activatedAt;
        return Math.mulDiv(b.amount, Math.min(elapsed, releaseDuration), releaseDuration);
    }

    function releasable(bytes32 slugHash) public view returns (uint256) {
        uint256 unlocked = Math.min(earned(slugHash), timeCap(slugHash));
        uint256 released = buckets[slugHash].released;
        return unlocked > released ? unlocked - released : 0;
    }

    function bucketCount() external view returns (uint256) {
        return bucketIds.length;
    }

    /**
     * @dev Buckets are keyed by the registry's slug hash, which is taken over the
     *      lowercased slug. Accepting only what the registry would store
     *      unchanged guarantees the two hashes agree; a mixed-case slug would
     *      create a bucket no project could ever match.
     */
    function _slugHash(string calldata slug) internal pure returns (bytes32) {
        bytes calldata s = bytes(slug);
        require(s.length >= 3 && s.length <= 32, "Slug: 3-32 chars");
        for (uint256 i = 0; i < s.length; i++) {
            bytes1 c = s[i];
            bool ok = (c >= "a" && c <= "z") || (c >= "0" && c <= "9")
                || (c == "-" && i > 0 && i < s.length - 1);
            require(ok, "Slug: lowercase a-z 0-9 -");
        }
        return keccak256(s);
    }
}
