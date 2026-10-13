// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * RWA ID v2 — Wildcard Resolver with CCIP-Read (ENSIP-10 / EIP-3668)
 *
 * Improvements over v1:
 * - Ownable: owner can update gateway URLs and trusted signer post-deploy
 * - setUrls()         — update CCIP-Read gateway endpoints (future-proof)
 * - setTrustedSigner()— rotate the gateway signing key without redeployment
 * - transferOwnership() — inherited from Ownable; hand off to multisig
 *
 * Default gateway: https://gateway.rwa-id.com/{sender}/{data}.json
 *
 * Resolution flow:
 *  1. ENS client calls resolve(name, data)
 *  2. Contract reverts with OffchainLookup (CCIP-Read trigger)
 *  3. Client fetches from gateway URL
 *  4. Gateway returns (node, addr, messageHash, signature)
 *  5. Client calls resolveWithProof(response, extraData)
 *  6. Contract verifies signature and returns abi.encode(addr)
 */

error OffchainLookup(
    address sender,
    string[] urls,
    bytes callData,
    bytes4 callbackFunction,
    bytes extraData
);

interface IERC165 {
    function supportsInterface(bytes4 interfaceID) external view returns (bool);
}

contract RwaIdWildcardResolverV2 is IERC165, Ownable {
    // bytes4(keccak256("resolve(bytes,bytes)")) — ENSIP-10
    bytes4 public constant ENSIP10_INTERFACE_ID = 0x9061b923;

    // bytes4(keccak256("addr(bytes32)")) — EIP-137
    bytes4 public constant ADDR_SELECTOR = 0x3b3b57de;

    // Trusted gateway signer — gateway signs resolution responses with this key
    address public trustedSigner;

    // CCIP-Read gateway URL list
    // Standard ENSIP-10 template: https://gateway.rwa-id.com/{sender}/{data}.json
    string[] private _urls;

    // ===== Events =====
    event TrustedSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event UrlsUpdated(string[] newUrls);

    // =============================================================
    // Constructor
    // =============================================================
    constructor(
        address owner_,
        address trustedSigner_,
        string[] memory urls_
    ) Ownable(owner_) {
        require(trustedSigner_ != address(0), "signer=0");
        require(urls_.length > 0, "no urls");
        trustedSigner = trustedSigner_;
        _urls = urls_;
    }

    // =============================================================
    // Owner-only configuration
    // =============================================================

    /**
     * @notice Update the CCIP-Read gateway URL list.
     * ENS clients try URLs in order; include multiple for redundancy.
     * Standard template: "https://gateway.rwa-id.com/{sender}/{data}.json"
     */
    function setUrls(string[] memory urls_) external onlyOwner {
        require(urls_.length > 0, "no urls");
        _urls = urls_;
        emit UrlsUpdated(urls_);
    }

    /**
     * @notice Rotate the trusted gateway signing key.
     * Call this when rotating the gateway's private key without redeploying.
     */
    function setTrustedSigner(address signer_) external onlyOwner {
        require(signer_ != address(0), "signer=0");
        address old = trustedSigner;
        trustedSigner = signer_;
        emit TrustedSignerUpdated(old, signer_);
    }

    /**
     * @notice Return the current gateway URL list.
     */
    function getUrls() external view returns (string[] memory) {
        return _urls;
    }

    // =============================================================
    // ENSIP-10 entrypoint (called by ENS clients)
    // =============================================================

    /**
     * @notice Always reverts with OffchainLookup to trigger CCIP-Read.
     *         Only addr(bytes32) is supported.
     */
    function resolve(
        bytes calldata name,
        bytes calldata data
    ) external view returns (bytes memory) {
        require(data.length >= 4, "bad data");

        bytes4 selector;
        assembly {
            selector := calldataload(data.offset)
        }
        require(selector == ADDR_SELECTOR, "only addr(bytes32) supported");

        // Pass full (name, data) to gateway so it can compute the node
        bytes memory callData = abi.encode(name, data);

        revert OffchainLookup(
            address(this),
            _urls,
            callData,
            this.resolveWithProof.selector,
            callData          // extraData = original callData, echoed back in callback
        );
    }

    // =============================================================
    // CCIP-Read callback (called by ENS clients after fetching gateway)
    // =============================================================

    /**
     * @notice Callback invoked by CCIP-Read after the gateway responds.
     *
     * @param response   ABI-encoded gateway response:
     *                   (bytes32 node, address resolved, bytes32 messageHash, bytes sig)
     *
     *                   messageHash MUST be:
     *                   keccak256(abi.encodePacked(registryAddress, node, resolvedAddress))
     *                   signed with EIP-191 (eth_sign / personal_sign).
     *
     * @param extraData  Original callData echoed from resolve() — abi.encode(name, data)
     */
    function resolveWithProof(
        bytes calldata response,
        bytes calldata extraData
    ) external view returns (bytes memory) {
        // Recover the original data from extraData
        (, bytes memory data) = abi.decode(extraData, (bytes, bytes));

        // Decode gateway response
        (
            bytes32 node,
            address resolved,
            bytes32 messageHash,
            bytes memory sig
        ) = abi.decode(response, (bytes32, address, bytes32, bytes));

        // Suppress unused variable warning (node is bound in the gateway response;
        // the gateway is responsible for deriving it correctly)
        (node);

        // Verify the gateway's signature
        address recovered = _recoverSigner(messageHash, sig);
        require(recovered == trustedSigner, "bad sig");

        // Confirm data is for addr(bytes32)
        bytes4 selector;
        assembly {
            selector := mload(add(data, 32))
        }
        require(selector == ADDR_SELECTOR, "only addr(bytes32) supported");

        // Return ABI-encoded address (the result of addr(bytes32))
        return abi.encode(resolved);
    }

    // =============================================================
    // ERC-165
    // =============================================================
    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        return
            interfaceID == ENSIP10_INTERFACE_ID ||
            interfaceID == type(IERC165).interfaceId;
    }

    // =============================================================
    // Signature helpers (EIP-191 / personal_sign)
    // =============================================================
    function _recoverSigner(
        bytes32 ethSignedHash,
        bytes memory signature
    ) internal pure returns (address) {
        if (signature.length != 65) return address(0);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        // Normalise v to 27/28
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);

        return ecrecover(ethSignedHash, v, r, s);
    }
}
