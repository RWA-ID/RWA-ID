// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/finance/VestingWallet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RWAIDToken.sol";
import "./RWAIDLiquidityLock.sol";
import "./RWAIDPlatformUnlock.sol";

interface IUniswapV3FactoryLite {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address);
    function feeAmountTickSpacing(uint24 fee) external view returns (int24);
}

interface IUniswapV3PoolLite {
    function slot0()
        external
        view
        returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, uint8, bool);
}

interface INonfungiblePositionManagerLite {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    function factory() external view returns (address);

    function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96)
        external
        payable
        returns (address pool);

    function mint(MintParams calldata params)
        external
        payable
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
}

/**
 * RWA ID token launch, in one transaction.
 *
 * Everything happens in the constructor, so nobody can act between the token
 * existing and its liquidity being in place: no one can create or price the
 * pool first, and no tokens sit in a half-distributed state. When the
 * constructor returns, this contract holds nothing and has no functions.
 *
 *   1. Mint the fixed supply of RWAIDToken to this contract.
 *   2. Founder vesting: an OpenZeppelin VestingWallet for the founder that
 *      starts after the cliff and releases linearly over `vestingDuration`.
 *   3. Platform unlock: fund RWAIDPlatformUnlock, add one bucket per reserved
 *      namespace, and start the two-step ownership handover to the Safe.
 *   4. Launch liquidity: create the TOKEN/WETH pool at the opening price and
 *      mint a single-sided position (only the token, priced from the opening
 *      price upward) straight into RWAIDLiquidityLock, which holds it forever
 *      and pays its trading fees to the Safe.
 *   5. Send everything left (treasury, open-platform pool, rounding dust) to the Safe.
 */
contract RWAIDLauncher {
    int24 internal constant MAX_TICK = 887272;

    struct Params {
        string name;
        string symbol;
        uint256 supply;
        address safe;
        address founder;
        address registry;
        address positionManager;
        address weth;
        uint24 fee;
        // Opening price as sqrt(WETH per token) in Q64.96, i.e. as if the token were token0.
        uint160 sqrtPriceX96TokenIsToken0;
        uint256 liquidityAmount;
        uint256 founderAmount;
        uint64 vestingStart;
        uint64 vestingDuration;
        uint256 claimsForFullUnlock;
        uint256 releaseDuration;
        uint256 activationDeadline;
        string[] slugs;
        uint256[] bucketAmounts;
    }

    RWAIDToken public immutable token;
    RWAIDLiquidityLock public immutable lock;
    VestingWallet public immutable founderVesting;
    RWAIDPlatformUnlock public immutable platformUnlock;
    address public immutable pool;
    uint256 public immutable positionId;

    event Launched(
        address token,
        address pool,
        uint256 positionId,
        address lock,
        address founderVesting,
        address platformUnlock,
        uint256 toSafe
    );

    constructor(Params memory p) {
        require(p.safe != address(0) && p.founder != address(0), "Zero address");
        token = new RWAIDToken(p.name, p.symbol, p.supply, address(this));

        founderVesting = new VestingWallet(p.founder, p.vestingStart, p.vestingDuration);
        require(token.transfer(address(founderVesting), p.founderAmount), "Vesting transfer");

        platformUnlock = _fundPlatformUnlock(p);

        lock = new RWAIDLiquidityLock(p.positionManager, p.safe);
        (pool, positionId) = _launchLiquidity(p);

        uint256 rest = token.balanceOf(address(this));
        require(token.transfer(p.safe, rest), "Safe transfer");

        emit Launched(address(token), pool, positionId, address(lock), address(founderVesting), address(platformUnlock), rest);
    }

    function _fundPlatformUnlock(Params memory p) internal returns (RWAIDPlatformUnlock unlock) {
        unlock = new RWAIDPlatformUnlock(
            address(token), p.registry, address(this), p.claimsForFullUnlock, p.releaseDuration, p.activationDeadline
        );
        uint256 total;
        for (uint256 i = 0; i < p.bucketAmounts.length; i++) total += p.bucketAmounts[i];
        require(token.transfer(address(unlock), total), "Unlock transfer");
        unlock.addBuckets(p.slugs, p.bucketAmounts);
        unlock.transferOwnership(p.safe); // Ownable2Step: the Safe accepts
    }

    function _launchLiquidity(Params memory p) internal returns (address pool_, uint256 tokenId) {
        INonfungiblePositionManagerLite npm = INonfungiblePositionManagerLite(p.positionManager);
        INonfungiblePositionManagerLite.MintParams memory m;
        bool tokenIsToken0 = address(token) < p.weth;
        (m.token0, m.token1) = tokenIsToken0 ? (address(token), p.weth) : (p.weth, address(token));
        m.fee = p.fee;

        // The same opening price, expressed for whichever order Uniswap sorts the pair into.
        uint160 sqrtPrice = tokenIsToken0
            ? p.sqrtPriceX96TokenIsToken0
            : uint160((uint256(1) << 192) / p.sqrtPriceX96TokenIsToken0);
        pool_ = npm.createAndInitializePoolIfNecessary(m.token0, m.token1, p.fee, sqrtPrice);

        // Single-sided: the whole range sits on the far side of the opening price,
        // so the position holds only the token and buyers move the price into it.
        (m.tickLower, m.tickUpper) = _range(pool_, npm.factory(), p.fee, tokenIsToken0);
        (m.amount0Desired, m.amount1Desired) = tokenIsToken0 ? (p.liquidityAmount, uint256(0)) : (uint256(0), p.liquidityAmount);
        m.recipient = address(lock);
        m.deadline = block.timestamp;

        token.approve(address(npm), p.liquidityAmount);
        (tokenId, , , ) = npm.mint(m);
        token.approve(address(npm), 0);
    }

    function _range(address pool_, address factory, uint24 fee, bool tokenIsToken0)
        internal
        view
        returns (int24 tickLower, int24 tickUpper)
    {
        (, int24 tick, , , , , ) = IUniswapV3PoolLite(pool_).slot0();
        int24 spacing = IUniswapV3FactoryLite(factory).feeAmountTickSpacing(fee);
        int24 maxUsable = (MAX_TICK / spacing) * spacing;
        if (tokenIsToken0) {
            tickLower = _floor(tick, spacing) + spacing; // strictly above the opening tick
            tickUpper = maxUsable;
        } else {
            tickLower = -maxUsable;
            tickUpper = _floor(tick, spacing); // at or below the opening tick
        }
    }

    /// @dev Round a tick down to a multiple of `spacing` (toward negative infinity).
    function _floor(int24 tick, int24 spacing) internal pure returns (int24) {
        int24 c = tick / spacing;
        if (tick < 0 && tick % spacing != 0) c--;
        return c * spacing;
    }
}
