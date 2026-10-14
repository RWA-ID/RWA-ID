// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @dev ENSIP-10 wildcard entry point.
interface IExtendedResolver {
    function resolve(bytes memory name, bytes memory data) external view returns (bytes memory);
}

/// @dev What the gateway is asked: the original (name, data), answered with a signed result.
interface IResolverService {
    function resolve(bytes calldata name, bytes calldata data)
        external
        view
        returns (bytes memory result, uint64 expires, bytes memory sig);
}

/**
 * RWA ID offchain resolver (Ethereum mainnet), successor to RwaIdWildcardResolverV2.
 *
 * Answers every ENS query under rwa-id.eth (ENSIP-10) by deferring to the RWA ID
 * CCIP-Read gateway (EIP-3668), which reads the registry and records on Robinhood
 * Chain. Any resolver profile the gateway answers is supported: addr (ETH),
 * addr(node, coinType) for other chains, text records.
 *
 * What changed from V2, and why: V2 accepted any signature over a gateway-
 * supplied hash and never bound it to the answer or the question, so one signed
 * response could be replayed with any address by whoever controlled the
 * transport. Here the signed digest is
 *
 *   keccak256(0x1900 ‖ this resolver ‖ expires ‖ keccak256(request) ‖ keccak256(result))
 *
 * (the ENS offchain-resolver scheme), so a signature is valid only for this
 * resolver, this exact query, this exact answer, and until it expires. Expiry is
 * also capped on-chain at MAX_VALIDITY, so a faulty gateway cannot mint
 * long-lived answers.
 */
contract RwaIdOffchainResolver is IExtendedResolver, IERC165, Ownable2Step {
    uint256 public constant MAX_VALIDITY = 1 hours;

    string[] private _urls;
    mapping(address => bool) public signers;

    error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);

    event UrlsUpdated(string[] urls);
    event SignerUpdated(address indexed signer, bool trusted);

    constructor(string[] memory urls_, address[] memory signers_, address owner_) Ownable(owner_) {
        require(urls_.length > 0, "No urls");
        _urls = urls_;
        emit UrlsUpdated(urls_);
        for (uint256 i = 0; i < signers_.length; i++) {
            require(signers_[i] != address(0), "Zero signer");
            signers[signers_[i]] = true;
            emit SignerUpdated(signers_[i], true);
        }
    }

    // =============================================================
    // Admin (owner: the protocol Safe)
    // =============================================================

    function setUrls(string[] memory urls_) external onlyOwner {
        require(urls_.length > 0, "No urls");
        _urls = urls_;
        emit UrlsUpdated(urls_);
    }

    function setSigner(address signer, bool trusted) external onlyOwner {
        require(signer != address(0), "Zero signer");
        signers[signer] = trusted;
        emit SignerUpdated(signer, trusted);
    }

    function urls() external view returns (string[] memory) {
        return _urls;
    }

    // =============================================================
    // Resolution
    // =============================================================

    /// @notice ENSIP-10 entry point. Always defers to the gateway.
    function resolve(bytes calldata name, bytes calldata data) external view override returns (bytes memory) {
        bytes memory callData = abi.encodeWithSelector(IResolverService.resolve.selector, name, data);
        revert OffchainLookup(address(this), _urls, callData, this.resolveWithProof.selector, callData);
    }

    /// @notice CCIP-Read callback: returns the gateway's answer only if a trusted signer signed it.
    function resolveWithProof(bytes calldata response, bytes calldata extraData) external view returns (bytes memory) {
        (bytes memory result, uint64 expires, bytes memory sig) = abi.decode(response, (bytes, uint64, bytes));
        require(expires >= block.timestamp, "Signature expired");
        require(expires <= block.timestamp + MAX_VALIDITY, "Expiry too far");
        address signer = ECDSA.recover(makeSignatureHash(address(this), expires, extraData, result), sig);
        require(signers[signer], "Invalid signer");
        return result;
    }

    /// @notice The digest the gateway signs (raw, not EIP-191 prefixed).
    function makeSignatureHash(address target, uint64 expires, bytes memory request, bytes memory result)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(hex"1900", target, expires, keccak256(request), keccak256(result)));
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IExtendedResolver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}
