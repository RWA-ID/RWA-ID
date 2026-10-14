// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev The one RWAIDv4 read this contract needs: the current holder of a name
///      (address(0) when unclaimed or revoked). Same chain, so no oracle.
interface IRWAIDResolveAddr {
    function resolveAddr(bytes32 node) external view returns (address);
}

/**
 * RWA ID records
 *
 * Per-name records that a name's current holder sets for themselves on Robinhood
 * Chain: addresses on other chains (ENSIP-9 / ENSIP-11 coin types) and text
 * records (ENSIP-5). The CCIP-Read gateway reads them and the mainnet resolver
 * serves them through ENS.
 *
 * Records are keyed by (node, holder). A record therefore belongs to the wallet
 * that wrote it: when a transferable name changes hands, or a name is revoked,
 * the previous holder's Bitcoin or Solana address stops resolving immediately,
 * without anyone having to clear it. The new holder starts from empty.
 *
 * The Ethereum address (coin type 60) is never stored here. It is always the
 * holder itself, read from the registry, so a name can never point its ETH
 * address anywhere but the wallet that holds it.
 *
 * No owner, no upgrade path, no fees.
 */
contract RWAIDRecords {
    uint256 public constant COIN_TYPE_ETH = 60;
    uint256 public constant MAX_ADDR_BYTES = 128;
    uint256 public constant MAX_KEY_BYTES = 64;
    uint256 public constant MAX_TEXT_BYTES = 1024;

    IRWAIDResolveAddr public immutable registry;

    mapping(bytes32 node => mapping(address holder => mapping(uint256 coinType => bytes))) private _addrs;
    mapping(bytes32 node => mapping(address holder => mapping(string key => string))) private _texts;

    event AddrChanged(bytes32 indexed node, address indexed holder, uint256 coinType, bytes addr);
    event TextChanged(bytes32 indexed node, address indexed holder, string indexed indexedKey, string key, string value);

    error NotHolder();
    error EthAddressIsTheHolder();
    error TooLong();

    constructor(address registry_) {
        require(registry_ != address(0), "Zero registry");
        registry = IRWAIDResolveAddr(registry_);
    }

    modifier onlyHolder(bytes32 node) {
        address holder = registry.resolveAddr(node);
        if (holder == address(0) || holder != msg.sender) revert NotHolder();
        _;
    }

    // =============================================================
    // Writes (current holder only)
    // =============================================================

    /// @notice Set (or, with empty bytes, clear) the address for one coin type.
    function setAddr(bytes32 node, uint256 coinType, bytes calldata addr_) external onlyHolder(node) {
        _setAddr(node, coinType, addr_);
    }

    /// @notice Set (or, with an empty value, clear) one text record.
    function setText(bytes32 node, string calldata key, string calldata value) external onlyHolder(node) {
        _setText(node, key, value);
    }

    /// @notice Set several records in one transaction.
    function setRecords(
        bytes32 node,
        uint256[] calldata coinTypes,
        bytes[] calldata addrs,
        string[] calldata keys,
        string[] calldata values
    ) external onlyHolder(node) {
        require(coinTypes.length == addrs.length && keys.length == values.length, "Length mismatch");
        for (uint256 i = 0; i < coinTypes.length; i++) _setAddr(node, coinTypes[i], addrs[i]);
        for (uint256 i = 0; i < keys.length; i++) _setText(node, keys[i], values[i]);
    }

    function _setAddr(bytes32 node, uint256 coinType, bytes calldata addr_) internal {
        if (coinType == COIN_TYPE_ETH) revert EthAddressIsTheHolder();
        if (addr_.length > MAX_ADDR_BYTES) revert TooLong();
        _addrs[node][msg.sender][coinType] = addr_;
        emit AddrChanged(node, msg.sender, coinType, addr_);
    }

    function _setText(bytes32 node, string calldata key, string calldata value) internal {
        uint256 k = bytes(key).length;
        if (k == 0 || k > MAX_KEY_BYTES || bytes(value).length > MAX_TEXT_BYTES) revert TooLong();
        _texts[node][msg.sender][key] = value;
        emit TextChanged(node, msg.sender, key, key, value);
    }

    // =============================================================
    // Reads (what the gateway serves)
    // =============================================================

    /// @notice The current holder's address for `coinType`. Coin type 60 is the holder.
    function addr(bytes32 node, uint256 coinType) external view returns (bytes memory) {
        address holder = registry.resolveAddr(node);
        if (holder == address(0)) return "";
        if (coinType == COIN_TYPE_ETH) return abi.encodePacked(holder);
        return _addrs[node][holder][coinType];
    }

    /// @notice The current holder's text record for `key`.
    function text(bytes32 node, string calldata key) external view returns (string memory) {
        address holder = registry.resolveAddr(node);
        if (holder == address(0)) return "";
        return _texts[node][holder][key];
    }

    /// @notice Records as written by a specific holder, current or not (for history and UIs).
    function addrOf(bytes32 node, address holder, uint256 coinType) external view returns (bytes memory) {
        return _addrs[node][holder][coinType];
    }

    function textOf(bytes32 node, address holder, string calldata key) external view returns (string memory) {
        return _texts[node][holder][key];
    }
}
