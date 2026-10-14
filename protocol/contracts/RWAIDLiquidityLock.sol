// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/// @dev The Uniswap v3 NonfungiblePositionManager calls this contract uses.
interface INonfungiblePositionManagerCollect {
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }

    function collect(CollectParams calldata params) external payable returns (uint256 amount0, uint256 amount1);
}

/**
 * RWA ID permanent liquidity lock
 *
 * Holds Uniswap v3 position NFTs forever. There is no function that withdraws
 * a position, decreases its liquidity or transfers the NFT, and no owner who
 * could add one: once a position is here, its liquidity can never leave the
 * pool.
 *
 * What does leave is the trading fees. collect() is callable by anyone and
 * always pays the fixed fee recipient (the protocol Safe), so fees keep
 * flowing even if nobody at RWA ID is around to press the button.
 */
contract RWAIDLiquidityLock is IERC721Receiver {
    address public immutable positionManager;
    address public immutable feeRecipient;

    event PositionLocked(uint256 indexed tokenId, address indexed from);
    event FeesCollected(uint256 indexed tokenId, uint256 amount0, uint256 amount1);

    constructor(address positionManager_, address feeRecipient_) {
        require(positionManager_ != address(0) && feeRecipient_ != address(0), "Zero address");
        positionManager = positionManager_;
        feeRecipient = feeRecipient_;
    }

    /// @notice Accept positions from the Uniswap position manager only.
    function onERC721Received(address, address from, uint256 tokenId, bytes calldata) external override returns (bytes4) {
        require(msg.sender == positionManager, "Only Uniswap positions");
        emit PositionLocked(tokenId, from);
        return IERC721Receiver.onERC721Received.selector;
    }

    /// @notice Send a locked position's accrued trading fees to the fee recipient.
    function collect(uint256 tokenId) external returns (uint256 amount0, uint256 amount1) {
        (amount0, amount1) = INonfungiblePositionManagerCollect(positionManager).collect(
            INonfungiblePositionManagerCollect.CollectParams({
                tokenId: tokenId,
                recipient: feeRecipient,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
        emit FeesCollected(tokenId, amount0, amount1);
    }
}
