// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * RWA ID protocol token.
 *
 * Fixed supply, minted once to `recipient` (the Safe), which then funds the
 * pool, the platform unlock, the vesting schedules and the treasury. No owner,
 * no mint function, no pause, no transfer tax — nothing in this contract can
 * change after deployment.
 *
 * Name, symbol and supply are constructor arguments so the deploy script, not
 * the contract, carries the final choice. The identity NFT already uses the
 * symbol "RWAID", so give the token a different one to keep explorers and
 * wallets from showing two assets with the same ticker.
 */
contract RWAIDToken is ERC20, ERC20Permit, ERC20Burnable {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 supply,
        address recipient
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        require(recipient != address(0), "Zero recipient");
        _mint(recipient, supply);
    }
}
