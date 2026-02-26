// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Minimal ENSIP-10 Wildcard Resolver with CCIP-Read (EIP-3668)
 *
 * Flow:
 *  - resolve(name, data) -> revert OffchainLookup(...) with gateway URL
 *  - gateway returns (node, addr, messageHash, signature)
 *  - resolveWithProof(...) verifies signature and returns ABI-encoded addr() result
 *
 * This MVP only supports: addr(bytes32)
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

contract RwaIdWildcardResolver is IERC165 {
  // ENSIP-10 interface id (bytes name, bytes data) -> bytes
  // bytes4(keccak256("resolve(bytes,bytes)"))
  bytes4 public constant ENSIP10_INTERFACE_ID = 0x9061b923;

  // addr(bytes32) selector
  bytes4 public constant ADDR_SELECTOR = 0x3b3b57de;

  // Trusted signer (your gateway signer)
  address public immutable trustedSigner;

  // Gateway URLs (can include {data} template, we’ll use raw query for simplicity)
  string[] public urls;

  constructor(address trustedSigner_, string[] memory urls_) {
    require(trustedSigner_ != address(0), "signer=0");
    trustedSigner = trustedSigner_;
    urls = urls_;
  }

  // ENSIP-10 entrypoint
  function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory) {
    // Only support addr(bytes32)
    require(data.length >= 4, "bad data");
    bytes4 selector;
    assembly {
      selector := calldataload(data.offset)
    }
    require(selector == ADDR_SELECTOR, "only addr");

    // We send the full name + data to gateway.
    // callData format for gateway: abi.encode(name, data)
    bytes memory callData = abi.encode(name, data);

    revert OffchainLookup(
      address(this),
      urls,
      callData,
      this.resolveWithProof.selector,
      callData
    );
  }

  /**
   * Callback from CCIP-Read.
   * response is expected to be ABI-encoded as:
   *   (bytes32 node, address resolved, bytes32 messageHash, bytes signature)
   *
   * messageHash MUST be:
   *   keccak256(abi.encodePacked(registryAddress, node, resolvedAddress))
   *
   * The gateway signs messageHash using EIP-191 (signMessage).
   */
  function resolveWithProof(bytes calldata response, bytes calldata extraData) external view returns (bytes memory) {
    // extraData is the original callData = abi.encode(name, data)
    (, bytes memory data) = abi.decode(extraData, (bytes, bytes));

    // decode gateway response
    (bytes32 node, address resolved, bytes32 messageHash, bytes memory sig) =
      abi.decode(response, (bytes32, address, bytes32, bytes));

    // Verify signature
    address recovered = _recoverSigner(messageHash, sig);
    require(recovered == trustedSigner, "bad sig");

    // Return ABI-encoded result for addr(bytes32)
    // addr(bytes32) returns an address
    // The resolver response for ENSIP-10 should be ABI-encoded return data of the function
    // which is just abi.encode(resolved)
    bytes4 selector;
    assembly {
      selector := mload(add(data, 32))
    }
    require(selector == ADDR_SELECTOR, "only addr");

    return abi.encode(resolved);
  }

  // ERC-165
  function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
    return interfaceID == ENSIP10_INTERFACE_ID || interfaceID == type(IERC165).interfaceId;
  }

  // ===== Signature helpers =====
  function _toEthSignedMessageHash(bytes32 h) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", h));
  }

  function _recoverSigner(bytes32 ethSignedHash, bytes memory signature) internal pure returns (address) {
    if (signature.length != 65) return address(0);

    bytes32 r;
    bytes32 s;
    uint8 v;

    assembly {
      r := mload(add(signature, 32))
      s := mload(add(signature, 64))
      v := byte(0, mload(add(signature, 96)))
    }

    // allow 27/28 or 0/1
    if (v < 27) v += 27;
    if (v != 27 && v != 28) return address(0);

    return ecrecover(ethSignedHash, v, r, s);
  }
}

