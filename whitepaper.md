# RWA ID: Human-Readable Identity Infrastructure for Tokenized Real World Assets

**Version 1.0**  
**February 2025**

---

## Abstract

RWA ID is a decentralized identity infrastructure layer that enables Real World Asset (RWA) platforms to issue human-readable, soulbound ENS subdomains for clients, tokenized assets, and issuers. Built on proven Web3 standards (ENS + EIP-3668 CCIP-Read), RWA ID provides universal identity resolution across wallets and blockchains without requiring custody, personal data collection, or complex identity verification.

This whitepaper presents the technical architecture, economic model, security considerations, and integration pathways for platforms seeking to implement human-readable identity infrastructure for the tokenized economy.

**Key Differentiators:**
- Non-custodial identity references (not credentials)
- Multi-chain resolution from day one
- Zero PII collection
- Protocol-enforced revenue sharing (v2)
- Built on battle-tested ENS infrastructure

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Technical Architecture](#4-technical-architecture)
5. [Implementation Details](#5-implementation-details)
6. [Security Model](#6-security-model)
7. [Economic Model](#7-economic-model)
8. [Platform Integration](#8-platform-integration)
9. [Regulatory Considerations](#9-regulatory-considerations)
10. [Multi-Chain Architecture](#10-multi-chain-architecture)
11. [Roadmap](#11-roadmap)
12. [Technical Specifications](#12-technical-specifications)
13. [Conclusion](#13-conclusion)
14. [References](#14-references)

---

## 1. Introduction

### 1.1 The Tokenization Thesis

The tokenization of real-world assets represents a fundamental shift in how financial instruments, physical assets, and legal rights are represented and transferred. Industry projections estimate the tokenized asset market will reach $16 trillion by 2030¹, driven by:

- Fractional ownership of previously illiquid assets
- 24/7 settlement and programmable compliance
- Reduced intermediary costs
- Global accessibility to institutional-grade investments

However, this transformation faces a critical infrastructure gap: **identity**.

### 1.2 The Identity Infrastructure Gap

While blockchain technology provides transparent and immutable transaction records, the underlying wallet addresses remain opaque hexadecimal strings (e.g., `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`). This creates fundamental challenges:

- **User Experience:** Institutional clients expect bank-like usability
- **Interoperability:** Every platform builds identity systems independently
- **Trust:** Opaque addresses reduce confidence in on-chain operations
- **Compliance:** Human-readable identities facilitate reporting and auditing

RWA ID addresses this infrastructure gap by providing neutral, shared identity infrastructure that works across platforms, chains, and wallets.

### 1.3 Design Principles

RWA ID is built on four core principles:

1. **Non-Custodial:** No custody of funds, assets, or private keys
2. **Privacy-Preserving:** No collection of personal identifiable information (PII)
3. **Interoperable:** Works across all major chains and wallets from day one
4. **Sustainable:** Protocol-enforced economics enable long-term development

---

## 2. Problem Statement

### 2.1 Current State: Fragmented Identity

RWA platforms today face several critical challenges:

#### 2.1.1 Opaque Wallet Addresses

Ethereum-style addresses (`0x742d...0bEb`) create poor user experience:
- Difficult to verify transactions visually
- Error-prone for manual entry
- No human-readable context
- Reduces institutional confidence

#### 2.1.2 Siloed Development

Every platform builds identity systems independently:
- Duplicated development effort
- No interoperability between platforms
- Inconsistent user experiences
- Wasted resources on commodity infrastructure

#### 2.1.3 Multi-Chain Fragmentation

Identity systems rarely work across chains:
- Users need different identities per chain
- Platform overhead multiplies with each chain
- Poor user experience switching between networks

#### 2.1.4 Cost & Complexity

Building robust identity infrastructure requires:
- Smart contract development and auditing
- Multi-chain deployment and maintenance
- Resolver infrastructure for ENS integration
- Ongoing operational costs

### 2.2 Existing Solutions & Limitations

Several approaches exist but fall short for RWA use cases:

| Solution | Limitation |
|----------|------------|
| **Direct ENS Registration** | Expensive (~$5+ per name), requires users to manage registrations |
| **Platform-Specific Systems** | Not interoperable, duplicates effort, doesn't resolve in wallets |
| **DIDs (Decentralized Identifiers)** | Complex standards, poor wallet support, designed for verifiable credentials |
| **Soulbound Tokens (SBTs)** | Visual only, don't provide human-readable addresses |

### 2.3 Requirements for RWA Identity

An ideal solution must:

✅ **Human-Readable:** Names instead of addresses  
✅ **Universal Resolution:** Works in all major wallets and chains  
✅ **Cost-Effective:** Affordable at scale for millions of identities  
✅ **Non-Custodial:** No trust assumptions or custody requirements  
✅ **Privacy-Preserving:** No PII collection  
✅ **Compliance-Friendly:** Supports regulatory requirements without becoming regulated entity  
✅ **Soulbound:** Non-transferable for stable identity references  

---

## 3. Solution Overview

### 3.1 RWA ID Architecture

RWA ID provides a three-layer identity infrastructure:

```
┌─────────────────────────────────────────────────┐
│           Application Layer                     │
│  (Wallets, dApps, Platforms, Exchanges)        │
└────────────────┬────────────────────────────────┘
                 │ ENS Resolution
┌────────────────▼────────────────────────────────┐
│           Identity Resolution Layer              │
│  (ENS Registry + CCIP-Read Resolver)            │
└────────────────┬────────────────────────────────┘
                 │ Proof Verification
┌────────────────▼────────────────────────────────┐
│           Identity Management Layer              │
│  (RWA ID Contracts + Merkle Proofs)             │
└─────────────────────────────────────────────────┘
```

### 3.2 Identity Format

RWA ID identities follow a hierarchical structure:

```
[identifier].[platform].[registry].eth

Examples:
- client.securitize.rwa-id.eth
- bond-series-a.issuer.rwa-id.eth
- treasury-wallet.dao.rwa-id.eth
```

This structure provides:
- **Clear ownership** (platform controls their namespace)
- **Predictable patterns** (easy to programmatically generate)
- **Human readability** (self-documenting identities)

### 3.3 Key Components

#### 3.3.1 Registry Contract (Linea)
- Project namespace creation
- Merkle root storage and management
- Claim verification and soulbound token issuance
- Multisig-controlled administration

**Address:** `0x74aaCeff8139c84433befB922a8E687B6ba51F3a`

#### 3.3.2 ENS Wildcard Resolver
- EIP-3668 CCIP-Read implementation
- Off-chain proof resolution
- Universal wallet compatibility

**Address:** `0x188a60a8bC5Df96CD12C64FBAf166075a5029c80`

#### 3.3.3 CCIP-Read Gateway
- Off-chain Merkle proof serving
- Metadata resolution
- High-availability architecture

**Gateway:** `https://rwaid-gatewayzip--nftworldeth.replit.app/{sender}/{data}.json`

### 3.4 Trust Model

RWA ID operates on a minimal trust model:

**Platforms trust:**
- Smart contract logic (open source, auditable)
- Ethereum/Linea consensus (battle-tested)
- ENS infrastructure (established standard)

**Platforms do NOT need to trust:**
- RWA ID team with custody
- Centralized databases
- Off-chain attestation services
- Third-party identity providers

---

## 4. Technical Architecture

### 4.1 System Overview

RWA ID uses a **wildcard resolver pattern** with off-chain computation and on-chain verification:

```
┌──────────────┐
│   Wallet     │  1. User attempts to resolve
│   (MetaMask) │     alice.platform.rwa-id.eth
└──────┬───────┘
       │
       ▼ 2. ENS lookup
┌──────────────────────┐
│   ENS Registry       │  3. Returns wildcard resolver
│   (Ethereum L1)      │     *.platform.rwa-id.eth → 0x188a...
└──────┬───────────────┘
       │
       ▼ 4. CCIP-Read request
┌──────────────────────┐
│   Wildcard Resolver  │  5. Calls off-chain gateway
│   (Linea)            │     GET /resolve?name=alice...
└──────┬───────────────┘
       │
       ▼ 6. Fetch proof + metadata
┌──────────────────────┐
│   CCIP Gateway       │  7. Returns Merkle proof + address
│   (Off-chain)        │     { proof: [...], address: 0x... }
└──────┬───────────────┘
       │
       ▼ 8. Verify proof on-chain
┌──────────────────────┐
│   Resolver Contract  │  9. Validates proof against Merkle root
│   (Linea)            │     return resolvedAddress
└──────┬───────────────┘
       │
       ▼ 10. Return result
┌──────────────────────┐
│   Wallet displays:   │
│   ✓ alice.platform   │
│     .rwa-id.eth      │
│   → 0x742d...0bEb    │
└──────────────────────┘
```

### 4.2 Merkle Tree Design

RWA ID uses Merkle trees for scalable, gas-efficient identity management:

#### 4.2.1 Leaf Construction
```solidity
bytes32 leaf = keccak256(abi.encodePacked(name, walletAddress));
```

Example:
```
name = "alice"
address = 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

leaf = keccak256(abi.encodePacked("alice", 0x742d...))
     = 0x8f4a7c...
```

#### 4.2.2 Tree Structure

For a platform with 4 clients:

```
                    Root: 0xabcd...
                   /              \
         0x1234...                  0x5678...
        /         \                /         \
   alice.eth   bob.eth       carol.eth   dave.eth
   0x742d...   0x8a3e...     0x9f2c...   0x3d5b...
```

**Key Properties:**
- **O(log n) verification:** Only need path from leaf to root
- **Gas efficiency:** Single root hash stored on-chain
- **Privacy:** Other clients not revealed during verification
- **Scalability:** Supports millions of identities with minimal gas

#### 4.2.3 Proof Verification

```solidity
function verify(
    bytes32[] calldata proof,
    bytes32 root,
    bytes32 leaf
) internal pure returns (bool) {
    bytes32 computedHash = leaf;
    
    for (uint256 i = 0; i < proof.length; i++) {
        bytes32 proofElement = proof[i];
        
        if (computedHash <= proofElement) {
            computedHash = keccak256(
                abi.encodePacked(computedHash, proofElement)
            );
        } else {
            computedHash = keccak256(
                abi.encodePacked(proofElement, computedHash)
            );
        }
    }
    
    return computedHash == root;
}
```

### 4.3 EIP-3668: CCIP-Read Protocol

RWA ID implements [EIP-3668](https://eips.ethereum.org/EIPS/eip-3668) for off-chain data resolution with on-chain verification.

#### 4.3.1 Request Flow

1. **Client calls resolver:**
   ```solidity
   resolver.addr(
       namehash("alice.platform.rwa-id.eth")
   )
   ```

2. **Resolver reverts with OffchainLookup:**
   ```solidity
   revert OffchainLookup(
       address sender,
       string[] urls,
       bytes callData,
       bytes4 callbackFunction,
       bytes extraData
   );
   ```

3. **Client fetches from gateway:**
   ```
   GET https://gateway.rwa-id.com/{sender}/{data}.json
   ```

4. **Gateway returns proof + data:**
   ```json
   {
       "data": "0x...",  // Encoded response
       "proof": ["0x...", "0x...", ...]
   }
   ```

5. **Client calls callback with proof:**
   ```solidity
   resolver.addrWithProof(
       response,
       extraData
   )
   ```

6. **Resolver verifies and returns:**
   ```solidity
   require(verifyProof(proof, root, leaf));
   return resolvedAddress;
   ```

#### 4.3.2 Security Guarantees

CCIP-Read provides:
- **Trust minimization:** Gateway cannot forge valid proofs
- **Censorship resistance:** Multiple gateways can serve same data
- **Verifiability:** All proofs checked on-chain
- **Performance:** Off-chain computation, on-chain security

### 4.4 ENS Integration

#### 4.4.1 Namespace Structure

```
rwa-id.eth (Root)
├── platform1.rwa-id.eth
│   ├── *.platform1.rwa-id.eth → Wildcard Resolver
│   └── Examples:
│       ├── alice.platform1.rwa-id.eth
│       └── bob.platform1.rwa-id.eth
└── platform2.rwa-id.eth
    ├── *.platform2.rwa-id.eth → Wildcard Resolver
    └── Examples:
        └── carol.platform2.rwa-id.eth
```

#### 4.4.2 Resolver Configuration

Each platform namespace has a wildcard resolver configured:

```javascript
// ENS Registry entry
registry.setResolver(
    namehash("*.platform.rwa-id.eth"),
    resolverAddress
);

// Resolver implements addr() interface
interface IResolver {
    function addr(bytes32 node) external view returns (address);
}
```

### 4.5 Soulbound Token Implementation

Once claimed, identities are soulbound (non-transferable):

```solidity
contract SoulboundIdentity is ERC721 {
    mapping(uint256 => bool) public claimed;
    
    function claim(
        bytes32[] calldata proof,
        string calldata name
    ) external {
        require(!claimed[tokenId], "Already claimed");
        require(verifyProof(proof), "Invalid proof");
        
        _mint(msg.sender, tokenId);
        claimed[tokenId] = true;
    }
    
    // Override transfer functions to prevent transfers
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        revert("Soulbound: transfer disabled");
    }
    
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        revert("Soulbound: transfer disabled");
    }
}
```

**Rationale:** Soulbound identities ensure stable identity references. If identities were transferable, `alice.platform.rwa-id.eth` could resolve to different addresses over time, breaking identity assumptions.

---

## 5. Implementation Details

### 5.1 Platform Onboarding Flow

```
┌─────────────────────────────────────────────────────┐
│ Step 1: Create Project Namespace                   │
│                                                     │
│ Platform → connect wallet                           │
│         → register "myplatform.rwa-id.eth"         │
│         → pay 0.0005 ETH one-time fee              │
│                                                     │
│ Result: myplatform.rwa-id.eth namespace created    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step 2: Upload Client Allowlist                    │
│                                                     │
│ CSV Format:                                         │
│   name,address                                      │
│   alice,0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb │
│   bob,0x8a3e2F95A120C3d0B35F46aC77B2F9A5C028dE81  │
│   carol,0x9f2cB8E4A5D3F6C7A8B9E0D1C2F3A4B5C6D7E8F9 │
│                                                     │
│ System → validates CSV                              │
│       → computes Merkle tree                        │
│       → generates root hash                         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step 3: Set Merkle Root On-Chain                   │
│                                                     │
│ Transaction:                                        │
│   contract.setMerkleRoot(                           │
│       projectId,                                    │
│       merkleRoot: 0xabcd1234...                     │
│   )                                                 │
│                                                     │
│ Gas cost: ~50,000 gas (~$0.50 on Linea)           │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step 4: Clients Claim Identities                   │
│                                                     │
│ Client → visit rwa-id.com/claim                     │
│       → connect wallet (0x742d...)                  │
│       → system detects: eligible for "alice"        │
│       → client signs transaction                    │
│       → pays gas (~$0.10)                          │
│                                                     │
│ Result: alice.myplatform.rwa-id.eth → 0x742d...   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step 5: Universal Resolution                       │
│                                                     │
│ Identity now resolves in:                           │
│   ✓ MetaMask                                        │
│   ✓ Trust Wallet                                    │
│   ✓ Rainbow                                         │
│   ✓ Uniswap Wallet                                  │
│   ✓ Any ENS-compatible wallet                       │
│                                                     │
│ Across all supported chains:                        │
│   ✓ Ethereum, Linea, Base, Optimism, Arbitrum...  │
└─────────────────────────────────────────────────────┘
```

### 5.2 CSV Upload Specification

Platforms upload CSV files with the following format:

```csv
name,address
alice,0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
bob,0x8a3e2F95A120C3d0B35F46aC77B2F9A5C028dE81
carol,0x9f2cB8E4A5D3F6C7A8B9E0D1C2F3A4B5C6D7E8F9
dave,0x3d5bC8F7A2E9D6C4B8A7F5E3D2C1B0A9F8E7D6C5
```

**Validation Rules:**
- UTF-8 encoding
- Header row required: `name,address`
- Name field: 3-32 characters, alphanumeric + hyphens
- Address field: Valid Ethereum address (checksummed or lowercase)
- Maximum 10,000 entries per upload (v1 limit)
- Duplicates automatically filtered

**Processing:**
1. Parse CSV and validate format
2. Verify address checksums
3. Filter duplicates
4. Sort entries (deterministic ordering)
5. Compute Merkle tree
6. Generate proofs for each entry
7. Store proofs in gateway database
8. Return Merkle root for on-chain commitment

### 5.3 Merkle Proof Generation

Example using JavaScript:

```javascript
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const { ethers } = require('ethers');

function generateMerkleTree(entries) {
    // entries = [
    //   { name: "alice", address: "0x742d..." },
    //   { name: "bob", address: "0x8a3e..." }
    // ]
    
    // Create leaves
    const leaves = entries.map(entry => {
        return ethers.utils.solidityKeccak256(
            ['string', 'address'],
            [entry.name, entry.address]
        );
    });
    
    // Build tree
    const tree = new MerkleTree(leaves, keccak256, {
        sortPairs: true
    });
    
    // Get root
    const root = tree.getHexRoot();
    
    // Generate proofs
    const proofs = entries.map((entry, index) => {
        return {
            name: entry.name,
            address: entry.address,
            proof: tree.getHexProof(leaves[index])
        };
    });
    
    return { root, proofs };
}

// Usage
const result = generateMerkleTree([
    { name: "alice", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" },
    { name: "bob", address: "0x8a3e2F95A120C3d0B35F46aC77B2F9A5C028dE81" }
]);

console.log("Merkle Root:", result.root);
console.log("Proofs:", result.proofs);
```

### 5.4 Client Claim Verification

Smart contract claim function:

```solidity
function claim(
    uint256 projectId,
    string calldata name,
    bytes32[] calldata proof
) external {
    // Get project's Merkle root
    bytes32 root = projectMerkleRoots[projectId];
    require(root != bytes32(0), "Project not found");
    
    // Compute leaf
    bytes32 leaf = keccak256(
        abi.encodePacked(name, msg.sender)
    );
    
    // Verify proof
    require(
        MerkleProof.verify(proof, root, leaf),
        "Invalid proof"
    );
    
    // Check not already claimed
    bytes32 claimId = keccak256(
        abi.encodePacked(projectId, msg.sender)
    );
    require(!claimed[claimId], "Already claimed");
    
    // Mark as claimed and mint soulbound token
    claimed[claimId] = true;
    _mint(msg.sender, tokenId);
    
    emit IdentityClaimed(projectId, name, msg.sender);
}
```

### 5.5 Gateway Implementation

The CCIP-Read gateway is a REST API that serves Merkle proofs:

```javascript
// Express.js endpoint
app.get('/:sender/:data.json', async (req, res) => {
    const { sender, data } = req.params;
    
    // Decode CCIP-Read request
    const request = decodeCCIPRequest(data);
    const { projectId, name } = request;
    
    // Fetch proof from database
    const proofData = await db.getProof(projectId, name);
    
    if (!proofData) {
        return res.status(404).json({
            error: "Identity not found"
        });
    }
    
    // Return proof + metadata
    res.json({
        address: proofData.address,
        proof: proofData.proof,
        metadata: {
            name: proofData.name,
            projectId: projectId
        }
    });
});
```

**Gateway Requirements:**
- High availability (99.9% uptime SLA for production)
- Low latency (< 100ms response time)
- Rate limiting (1000 req/min per IP)
- CORS enabled for wallet integrations
- HTTPS/TLS required

---

## 6. Security Model

### 6.1 Threat Model

RWA ID considers the following threat actors:

1. **Malicious Gateway Operator:** Attempts to return false proofs
2. **Compromised Platform Admin:** Attempts to issue unauthorized identities
3. **Phishing Attackers:** Attempts to trick users into claiming wrong identities
4. **Smart Contract Exploits:** Attempts to bypass claim verification

### 6.2 Security Properties

#### 6.2.1 Proof Integrity

**Property:** Gateway cannot forge valid Merkle proofs

**Mechanism:**
- Merkle root stored on-chain (immutable)
- Proof verification happens on-chain
- Invalid proofs rejected by smart contract
- Gateway has no signing keys or special privileges

**Attack Scenario:**
```
Malicious gateway returns:
  alice.platform.rwa-id.eth → 0xATTACKER_ADDRESS

Contract verification:
  leaf = keccak256("alice", 0xATTACKER_ADDRESS)
  verify(proof, root, leaf) → FALSE ❌
  
Transaction reverts, attack fails.
```

#### 6.2.2 Namespace Isolation

**Property:** Platforms cannot issue identities in other platforms' namespaces

**Mechanism:**
- Each project has unique projectId
- Merkle roots mapped to specific projectId
- Claims verified against project-specific root

**Attack Scenario:**
```
Platform A attempts to claim identity in Platform B's namespace:
  claim(projectId: B, name: "alice", proof: [...])
  
Contract checks:
  root = merkleRoots[projectId: B]  // Platform B's root
  leaf = keccak256("alice", msg.sender)
  verify(proof, root, leaf) → FALSE ❌
  
Platform A's proof invalid for Platform B's root.
```

#### 6.2.3 Soulbound Guarantees

**Property:** Identities cannot be transferred after claim

**Mechanism:**
- ERC-721 transfer functions overridden to revert
- No approve/transferFrom functionality
- Only minting allowed (one-time claim)

**Benefits:**
- Stable identity references
- Prevents identity marketplaces
- Aligns with KYC/compliance requirements

#### 6.2.4 Claim Once Per Address

**Property:** Each wallet can claim at most one identity per project

**Mechanism:**
```solidity
mapping(bytes32 => bool) public claimed;

bytes32 claimId = keccak256(
    abi.encodePacked(projectId, msg.sender)
);
require(!claimed[claimId], "Already claimed");
claimed[claimId] = true;
```

**Prevents:**
- Double-claiming from same wallet
- Wallet address reuse attacks
- Claim front-running

### 6.3 Admin Controls

#### 6.3.1 Multisig Governance

Critical operations require multisig approval:

```
Multisig Address: [To be deployed - Safe multisig]
Threshold: 2-of-3
Signers: 
  - Founder
  - Technical Lead  
  - Community Representative
```

**Protected Operations:**
- Contract upgrades (if proxy pattern used)
- Emergency pause
- Fee parameter changes
- Treasury withdrawals

#### 6.3.2 Emergency Pause

Contract includes emergency pause functionality:

```solidity
bool public paused;

modifier whenNotPaused() {
    require(!paused, "Contract paused");
    _;
}

function pause() external onlyMultisig {
    paused = true;
    emit Paused();
}

function unpause() external onlyMultisig {
    paused = false;
    emit Unpaused();
}
```

**Pause Conditions:**
- Critical vulnerability discovered
- Widespread malicious claims
- Chain reorganization detected
- Requires multisig approval (2-of-3)

### 6.4 Audit Status

**v1 Status:** Internal security review completed

**Planned Audits:**
- Target: Q2 2025
- Scope: Core contracts + resolver logic
- Auditor: [TBD - seeking recommendations]

**Bug Bounty:**
- Platform: [To be launched]
- Rewards: Up to $50,000 for critical vulnerabilities

---

## 7. Economic Model

### 7.1 v1 Economics (Current)

The current v1 model focuses on **accessibility and adoption**:

| Action | Cost | Recipient |
|--------|------|-----------|
| Create project namespace | 0.0005 ETH (~$1.25) | RWA ID Treasury |
| Upload CSV allowlist | Gas only (~$0.50) | Network validators |
| Client claims identity | Gas only (~$0.10) | Network validators |

**Design Rationale:**
- Minimal barrier to platform adoption
- No per-client costs for platforms
- Users pay only network fees
- Focus on product-market fit

**v1 Revenue Model:**
- Primarily namespace registration fees
- Sustainable for initial development
- Not designed for long-term protocol operations

### 7.2 v2 Economics (Planned)

v2 introduces **protocol-enforced monetization** with transparent revenue sharing:

#### 7.2.1 Fee Structure

```
Platform creates project namespace
         ↓
Platform sets optional per-claim fee
  (e.g., 0.001 ETH / ~$2.50)
         ↓
Platform sets treasury address
         ↓
Client claims identity and pays fee
         ↓
Protocol automatically enforces split:
  ┌───────────────────┐
  │   70% → Platform  │  (0.0007 ETH)
  │   30% → RWA ID    │  (0.0003 ETH)
  └───────────────────┘
```

#### 7.2.2 Smart Contract Implementation

```solidity
struct Project {
    address treasury;
    uint256 claimFee;  // in wei
    bytes32 merkleRoot;
}

mapping(uint256 => Project) public projects;

function claimWithFee(
    uint256 projectId,
    string calldata name,
    bytes32[] calldata proof
) external payable {
    Project memory project = projects[projectId];
    
    // Verify fee payment
    require(msg.value == project.claimFee, "Incorrect fee");
    
    // Verify proof and mint (standard v1 logic)
    // ... verification code ...
    
    // Enforce revenue split
    uint256 platformShare = (msg.value * 70) / 100;
    uint256 protocolShare = msg.value - platformShare;
    
    // Transfer funds
    (bool success1, ) = project.treasury.call{
        value: platformShare
    }("");
    require(success1, "Platform transfer failed");
    
    (bool success2, ) = protocolTreasury.call{
        value: protocolShare
    }("");
    require(success2, "Protocol transfer failed");
    
    emit FeeSplit(projectId, platformShare, protocolShare);
}
```

#### 7.2.3 Economic Properties

**On-Chain Enforcement:**
- No off-chain accounting required
- No payment disputes possible
- Transparent, verifiable splits
- Instant settlement

**Aligned Incentives:**
- Platforms earn revenue from their users
- Protocol funded for ongoing development
- Users pay predictable, known costs
- No hidden fees or middlemen

**Flexibility:**
- Platforms set their own fee (0 to reasonable maximum)
- Optional model (platforms can keep v1 gas-only if preferred)
- Market-driven pricing

#### 7.2.4 Revenue Projections

Conservative scenarios for v2 adoption:

| Scenario | Platforms | Avg Clients/Platform | Avg Fee | Annual Volume |
|----------|-----------|---------------------|---------|---------------|
| **Conservative** | 5 | 1,000 | $1.00 | $5,000 |
| **Moderate** | 20 | 5,000 | $1.50 | $150,000 |
| **Optimistic** | 50 | 10,000 | $2.00 | $1,000,000 |

**RWA ID Protocol Share (30%):**
- Conservative: $1,500/year
- Moderate: $45,000/year
- Optimistic: $300,000/year

**Use of Protocol Revenue:**
- Smart contract audits and security
- Gateway infrastructure and scaling
- Multi-chain deployment costs
- Developer ecosystem grants
- Ongoing protocol development

### 7.3 Token Economics

**Current Status:** No token issued

**Future Considerations:**
- Governance token for protocol parameters
- Staking mechanisms for gateway operators
- Incentive alignment for ecosystem participants

**No Current Plans For:**
- Fundraising via token sale
- Airdrop to early users
- Token required for protocol usage

---

## 8. Platform Integration

### 8.1 Integration Checklist

Platforms integrating RWA ID should follow this checklist:

#### Phase 1: Planning
- [ ] Define identity naming convention
- [ ] Determine which entities need identities (clients, assets, issuers)
- [ ] Estimate total identity volume
- [ ] Review regulatory requirements for identity systems
- [ ] Allocate budget for namespace creation

#### Phase 2: Setup
- [ ] Create project namespace at rwa-id.com
- [ ] Configure multisig treasury for v2 fees (optional)
- [ ] Generate CSV of initial clients
- [ ] Test CSV upload in staging environment

#### Phase 3: Deployment
- [ ] Upload production CSV
- [ ] Verify Merkle root transaction
- [ ] Test claim flow with team member wallet
- [ ] Verify ENS resolution in multiple wallets

#### Phase 4: Launch
- [ ] Communicate claim instructions to clients
- [ ] Monitor claim transactions
- [ ] Provide support for claim issues
- [ ] Track resolution in wallets/dApps

#### Phase 5: Operations
- [ ] Periodic allowlist updates for new clients
- [ ] Monitor gateway uptime and performance
- [ ] Review analytics dashboard
- [ ] Collect user feedback

### 8.2 Integration Patterns

#### 8.2.1 Pattern: Client Onboarding

**Use Case:** Securities platform issues identities to verified clients

```javascript
// Step 1: Generate allowlist from KYC database
const clients = await db.query(`
    SELECT user_id, wallet_address 
    FROM kyc_approved_users
    WHERE status = 'approved'
`);

const allowlist = clients.map(client => ({
    name: `client-${client.user_id}`,  // e.g., client-1234
    address: client.wallet_address
}));

// Step 2: Upload to RWA ID
const csv = convertToCSV(allowlist);
await rwaId.uploadAllowlist(projectId, csv);

// Step 3: Client claims
// User visits: https://rwa-id.com/claim
// Automatically detects eligibility
// Claims: client-1234.securitize.rwa-id.eth
```

#### 8.2.2 Pattern: Asset Tokenization

**Use Case:** Real estate platform issues identities to tokenized properties

```javascript
// Property token contract
const propertyIds = [
    { tokenId: 1, address: "123 Main St, Miami" },
    { tokenId: 2, address: "456 Ocean Blvd, LA" }
];

const allowlist = propertyIds.map(prop => ({
    name: `property-${prop.tokenId}`,
    address: prop.contractAddress  // Token contract address
}));

// Result:
// property-1.realty.rwa-id.eth → 0xCONTRACT_1
// property-2.realty.rwa-id.eth → 0xCONTRACT_2
```

#### 8.2.3 Pattern: DAO Governance

**Use Case:** DAO issues identities to core contributors

```javascript
const contributors = [
    { role: "treasury", address: "0x..." },
    { role: "operations", address: "0x..." },
    { role: "grants", address: "0x..." }
];

const allowlist = contributors.map(c => ({
    name: c.role,
    address: c.address
}));

// Result:
// treasury.dao.rwa-id.eth → 0xTREASURY_MULTISIG
// operations.dao.rwa-id.eth → 0xOPS_WALLET
```

### 8.3 SDK & Libraries

#### 8.3.1 JavaScript/TypeScript SDK

```typescript
import { RWAIDClient } from '@rwa-id/sdk';

const client = new RWAIDClient({
    network: 'linea',
    projectId: 'your-project-id'
});

// Check eligibility
const eligible = await client.checkEligibility(
    walletAddress,
    'alice'
);

// Get claim proof
const proof = await client.getClaimProof(
    walletAddress,
    'alice'
);

// Submit claim transaction
const tx = await client.claim(
    'alice',
    proof,
    { signer: wallet }
);

// Resolve identity
const address = await client.resolve(
    'alice.myplatform.rwa-id.eth'
);
```

#### 8.3.2 Smart Contract Integration

```solidity
// Platform contract verifies identity ownership
interface IRWAIDRegistry {
    function ownerOf(
        uint256 projectId,
        string calldata name
    ) external view returns (address);
}

contract PlatformContract {
    IRWAIDRegistry public rwaId;
    uint256 public projectId;
    
    modifier onlyVerifiedClient() {
        // Reverse lookup: which identity does msg.sender own?
        address identityOwner = rwaId.ownerOf(
            projectId,
            getClientName(msg.sender)
        );
        require(
            identityOwner == msg.sender,
            "Not a verified client"
        );
        _;
    }
    
    function executeTrade() external onlyVerifiedClient {
        // Only clients with RWA ID can trade
        // ...
    }
}
```

### 8.4 Analytics & Monitoring

Platforms receive access to analytics dashboard showing:

- **Claim Metrics:**
  - Total eligible clients
  - Claimed vs unclaimed
  - Claim rate over time
  - Failed claim attempts

- **Resolution Metrics:**
  - ENS resolution requests
  - Geographic distribution
  - Wallet types (MetaMask, Trust, etc.)
  - Chain distribution

- **Financial Metrics (v2):**
  - Total revenue collected
  - Revenue split (platform vs protocol)
  - Average fee per claim
  - Projected monthly revenue

### 8.5 Support & Documentation

**Integration Support:**
- Email: partner@rwa-id.com
- Response time: < 24 hours
- Dedicated integration engineer for design partners

**Documentation:**
- Technical overview: [Notion link]
- API reference: [Coming soon]
- Video tutorials: Available upon request
- Sample integrations: GitHub examples repo

---

## 9. Regulatory Considerations

### 9.1 Regulatory Design Principles

RWA ID is designed as **infrastructure only** to minimize regulatory complexity:

#### 9.1.1 No Personal Data Collection

**What RWA ID Does NOT Collect:**
- Names (beyond pseudonymous identifiers)
- Email addresses
- Phone numbers
- Physical addresses
- Government IDs
- Biometric data
- IP addresses (beyond standard server logs)
- Financial information

**What RWA ID DOES Store:**
- Wallet addresses (public blockchain data)
- Chosen pseudonyms (e.g., "alice")
- Merkle proofs (cryptographic hashes)
- Transaction history (public blockchain data)

**GDPR Compliance:**
- No personal data = no GDPR obligations for RWA ID
- Platforms remain data controllers for their own KYC
- Right to erasure: Not applicable (no personal data stored)

#### 9.1.2 No Identity Verification

RWA ID **does not:**
- Verify identity claims
- Perform KYC/AML checks
- Assert real-world identity
- Validate document authenticity
- Screen against sanctions lists

RWA ID **only:**
- Provides namespace infrastructure
- Enables human-readable references
- Facilitates self-sovereign claims
- Resolves identities across wallets

**Analogy:** RWA ID is like domain name registration (ICANN), not identity verification (Stripe Identity).

#### 9.1.3 Platform Responsibility

```
┌─────────────────────────────────────────┐
│         Platform Responsibilities        │
├─────────────────────────────────────────┤
│ ✓ KYC/AML verification                  │
│ ✓ Sanctions screening                   │
│ ✓ Regulatory compliance                 │
│ ✓ Customer support                      │
│ ✓ Data privacy (GDPR, etc.)            │
│ ✓ Access control                        │
│ ✓ Terms of service enforcement         │
└─────────────────────────────────────────┘
                  ↓
         Uses RWA ID for:
                  ↓
┌─────────────────────────────────────────┐
│       RWA ID Infrastructure Layer       │
├─────────────────────────────────────────┤
│ ✓ Human-readable identifiers            │
│ ✓ ENS resolution                        │
│ ✓ Soulbound tokens                      │
│ ✓ Multi-chain support                   │
└─────────────────────────────────────────┘
```

### 9.2 Jurisdictional Analysis

#### 9.2.1 United States

**Regulatory Framework:**
- **SEC:** Not a security (no investment contract)
- **FinCEN:** Not a money transmitter (no custody)
- **State licensing:** Likely not required (infrastructure only)

**Supporting Factors:**
- No custody of funds or assets
- No financial services provided
- Platforms perform KYC, not RWA ID
- Infrastructure service (like AWS or Cloudflare)

**Considerations:**
- Monitor FinCEN guidance on "money services businesses"
- State-by-state analysis for RWA platforms (platform responsibility)
- Potential Treasury OFAC compliance (platform responsibility)

#### 9.2.2 European Union

**Regulatory Framework:**
- **GDPR:** Minimal applicability (no PII collection)
- **MiCA:** Not applicable (not a crypto-asset service provider)
- **PSD2:** Not applicable (no payment services)

**Supporting Factors:**
- Wallet addresses = public blockchain data (not personal data under GDPR)
- Pseudonymous identifiers = not personal data
- No payment processing
- Infrastructure layer only

#### 9.2.3 United Kingdom

**Regulatory Framework:**
- **FCA:** Not a regulated activity (no financial services)
- **Data Protection Act:** Similar to GDPR analysis
- **MLR 2017:** Platform responsibility for AML, not RWA ID

#### 9.2.4 Other Jurisdictions

RWA ID's infrastructure-only model is designed to operate globally with minimal jurisdiction-specific requirements. Platforms using RWA ID remain responsible for compliance in their operating jurisdictions.

### 9.3 Compliance Best Practices for Platforms

Platforms using RWA ID should:

1. **Maintain KYC Records:** Keep KYC documentation separately from RWA ID
2. **Map Identities:** Internal mapping of RWA ID names to KYC records
3. **Access Control:** Use RWA ID verification in smart contracts for gating
4. **Audit Trails:** Log all identity-related operations
5. **Terms of Service:** Clearly define identity usage policies
6. **Revocation Process:** Ability to block users without transferring identities

### 9.4 Legal Opinion Status

**Current Status:** Preliminary internal legal analysis completed

**Planned:**
- Formal legal opinion from specialized Web3 law firm
- Regulatory mapping across key jurisdictions
- Compliance framework documentation for platforms

---

## 10. Multi-Chain Architecture

### 10.1 Chain Support Matrix

RWA ID identities resolve across multiple chains:

| Chain | Status | Resolver Address | Notes |
|-------|--------|------------------|-------|
| **Ethereum** | ✅ Live | Native ENS | L1 resolution via ENS registry |
| **Linea** | ✅ Live | `0x188a60...` | Primary deployment, lowest costs |
| **Base** | ✅ Live | Native ENS | Coinbase L2, growing DeFi |
| **Optimism** | ✅ Live | Native ENS | Optimistic rollup, low fees |
| **Arbitrum** | ✅ Live | Native ENS | Fastest growing L2 |
| **Polygon** | ✅ Live | Native ENS | High throughput, low costs |

### 10.2 Cross-Chain Resolution

ENS natively supports resolution across L2s through a standardized interface:

```
User on Base queries: alice.platform.rwa-id.eth
         ↓
Base ENS Registry checks L1 ENS
         ↓
L1 ENS returns resolver: 0x188a60... (Linea)
         ↓
CCIP-Read to gateway (chain-agnostic)
         ↓
Gateway returns proof
         ↓
Resolver verifies on Linea
         ↓
Result cached and returned to Base user
```

**Key Property:** Identity claimed on Linea resolves on all chains

### 10.3 Future Chain Support

**Planned:**
- zkSync Era
- Scroll
- Starknet (with ENS adapter)
- Solana (via Wormhole + SNS integration)

**Requirements for New Chain:**
- ENS registry or compatible naming system
- CCIP-Read support in wallets
- Sufficient user demand

### 10.4 Chain Selection for Primary Deployment

**Why Linea?**

| Factor | Linea | Ethereum L1 | Other L2s |
|--------|-------|-------------|-----------|
| **Costs** | ~$0.10 per claim | ~$10+ per claim | ~$0.50 per claim |
| **Speed** | 2-3 second finality | 12 second blocks | 2-10 seconds |
| **EVM Compatibility** | 100% | 100% | 95-99% |
| **ENS Support** | Native | Native | Native |
| **Maturity** | Production ready | Battle-tested | Varies |

**Decision:** Linea offers best balance of cost, speed, and ENS compatibility

---

## 11. Roadmap

### 11.1 Historical Development

**December 2024:** Concept and architecture design  
**January 2025:** Smart contract development and testing  
**Mid-January 2025:** Linea mainnet deployment (v1)  
**Late January 2025:** Platform console and claim portal launch  
**Early February 2025:** Multi-chain resolution verified  

### 11.2 Current Phase: v1 Foundation (Q1 2025)

**Goals:**
- ✅ Core contracts deployed and operational
- ✅ Platform creation and CSV upload working
- ✅ Client claiming functional
- ✅ Multi-chain resolution verified
- 🔄 Onboard first design partner platform
- 🔄 Gather integration feedback
- 🔄 Refine UX based on real usage

**Metrics:**
- Target: 1-3 production platforms by end of Q1
- Target: 100-1000 claimed identities
- Target: 99.9% gateway uptime

### 11.3 v2 Development (Q2 2025)

**Features:**
- Protocol-enforced fee splitting (70/30 model)
- Platform treasury configuration
- Optional monetization for platforms
- Enhanced analytics dashboard
- Batch operations for large allowlists

**Prerequisites:**
- At least one production platform using v1
- User feedback incorporated
- Security audit completed

### 11.4 Ecosystem Growth (Q2-Q3 2025)

**Infrastructure:**
- Multiple gateway instances for redundancy
- Enhanced monitoring and alerting
- Public API for third-party integrations
- SDK for popular languages (JS, Python, Solidity)

**Partnerships:**
- Integration with major RWA platforms
- Wallet partnerships for enhanced UX
- DeFi protocol integrations
- Compliance tool partnerships

**Community:**
- Developer documentation site
- Integration examples repository
- Technical blog and case studies
- Bug bounty program launch

### 11.5 Long-Term Vision (2025-2026)

**Advanced Features:**
- Delegated identity management (sub-identities)
- Programmable identity attributes (metadata)
- Cross-platform identity portability
- DAO-governed parameter updates

**Scaling:**
- zkSNARK-based proof aggregation
- Layer 3 deployment for extreme scale
- Global CDN for gateway network
- Enterprise SLA offerings

**Governance:**
- Transition to community governance
- Protocol parameter voting
- Treasury management by token holders
- Ecosystem grants program

---

## 12. Technical Specifications

### 12.1 Smart Contract Interfaces

#### 12.1.1 Core Registry Interface

```solidity
interface IRWAIDRegistry {
    // Project management
    function createProject(
        string calldata slug
    ) external payable returns (uint256 projectId);
    
    function setMerkleRoot(
        uint256 projectId,
        bytes32 merkleRoot
    ) external;
    
    // Identity claiming
    function claim(
        uint256 projectId,
        string calldata name,
        bytes32[] calldata proof
    ) external;
    
    function claimWithFee(
        uint256 projectId,
        string calldata name,
        bytes32[] calldata proof
    ) external payable;
    
    // Queries
    function ownerOf(
        uint256 projectId,
        string calldata name
    ) external view returns (address);
    
    function isClaimed(
        uint256 projectId,
        address wallet
    ) external view returns (bool);
    
    // Events
    event ProjectCreated(
        uint256 indexed projectId,
        string slug,
        address indexed creator
    );
    
    event MerkleRootSet(
        uint256 indexed projectId,
        bytes32 merkleRoot
    );
    
    event IdentityClaimed(
        uint256 indexed projectId,
        string name,
        address indexed claimer
    );
}
```

#### 12.1.2 Resolver Interface

```solidity
interface IENSResolver {
    // EIP-3668 CCIP-Read
    function resolve(
        bytes calldata name,
        bytes calldata data
    ) external view returns (bytes memory);
    
    // Standard ENS addr() interface
    function addr(
        bytes32 node
    ) external view returns (address);
    
    function addr(
        bytes32 node,
        uint256 coinType
    ) external view returns (bytes memory);
    
    // Text records (optional)
    function text(
        bytes32 node,
        string calldata key
    ) external view returns (string memory);
}
```

### 12.2 Data Structures

#### 12.2.1 Project Structure

```solidity
struct Project {
    string slug;                  // e.g., "platform"
    address creator;              // Platform admin address
    address treasury;             // v2: fee recipient
    bytes32 merkleRoot;           // Current allowlist root
    uint256 claimFee;            // v2: optional fee in wei
    uint256 claimedCount;        // Number of claimed identities
    uint256 totalAllowlisted;    // Total eligible addresses
    uint256 createdAt;           // Timestamp
    bool active;                 // Can be paused by admin
}
```

#### 12.2.2 Claim Record

```solidity
struct ClaimRecord {
    address claimer;             // Wallet that claimed
    string name;                 // Claimed identifier
    uint256 projectId;           // Associated project
    uint256 claimedAt;          // Timestamp
    uint256 tokenId;            // ERC-721 token ID
}
```

### 12.3 Gas Costs

| Operation | Gas Used | Cost at 20 gwei | Cost at 50 gwei |
|-----------|----------|-----------------|-----------------|
| Create project | ~150,000 | ~$0.60 | ~$1.50 |
| Set Merkle root | ~50,000 | ~$0.20 | ~$0.50 |
| Claim identity | ~120,000 | ~$0.48 | ~$1.20 |
| Resolve (view) | 0 (off-chain) | $0 | $0 |

*Estimates for Linea network*

### 12.4 API Endpoints

#### 12.4.1 CCIP-Read Gateway

```
GET /{sender}/{data}.json

Query Parameters:
  - sender: Resolver contract address
  - data: Encoded name resolution request

Response:
{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "proof": [
        "0x1234...",
        "0x5678..."
    ],
    "metadata": {
        "name": "alice",
        "projectId": 1
    }
}
```

#### 12.4.2 Platform API (Future)

```
POST /api/v1/projects
Body: {
    "slug": "myplatform",
    "treasury": "0x..."
}

POST /api/v1/projects/{id}/allowlist
Body: CSV file

GET /api/v1/projects/{id}/claims
Response: {
    "total": 100,
    "claimed": 75,
    "claims": [...]
}
```

### 12.5 Dependencies

**Smart Contracts:**
- OpenZeppelin Contracts v4.9.0
  - ERC721.sol
  - Ownable.sol
  - ReentrancyGuard.sol
- ENS Contracts v0.0.22
  - ENS.sol
  - Resolver.sol

**Off-Chain:**
- Node.js v18+
- Express.js v4.18+
- ethers.js v6.0+
- merkletreejs v0.3.11

---

## 13. Conclusion

### 13.1 Summary

RWA ID provides essential identity infrastructure for the tokenized economy:

- **Human-Readable:** Replaces opaque addresses with meaningful names
- **Universal:** Works across all major chains and wallets
- **Non-Custodial:** No trust assumptions or custody requirements
- **Privacy-Preserving:** No PII collection
- **Sustainable:** Protocol-enforced economics (v2)
- **Proven Technology:** Built on ENS and EIP-3668 standards

### 13.2 Current Status

- ✅ **v1 Live:** Core infrastructure deployed on Linea
- ✅ **Production Ready:** Platform creation and claiming operational
- ✅ **Multi-Chain:** Resolution working across 6+ networks
- 🔄 **Seeking Partners:** Design partner platforms for v2 development

### 13.3 Call to Action

**For RWA Platforms:**

Partner with RWA ID to:
- Eliminate identity infrastructure development costs
- Provide better UX for institutional clients
- Enable interoperability with the broader ecosystem
- Access shared, battle-tested infrastructure

**Contact:** partner@rwa-id.com

**For Developers:**

- Explore the codebase: [github.com/RWA-ID/RWA-ID](https://github.com/RWA-ID/RWA-ID)
- Read technical docs: [Technical Overview](https://www.notion.so/RWA-ID-Technical-Overview-Reference-Implementation-2f775dbae2778094a03fd6b967edbdfa)
- Try the demo: [rwa-id.com](https://rwa-id.com)

### 13.4 Vision

RWA ID aims to become the standard identity layer for tokenized assets, enabling:

- Seamless user experiences across RWA platforms
- Interoperable identity across DeFi and TradFi
- Foundation for compliance and regulatory frameworks
- Infrastructure for the $16T tokenized asset economy

By providing neutral, open infrastructure, RWA ID accelerates the adoption of tokenization and brings institutions on-chain with confidence.

---

## 14. References

### 14.1 Standards & Protocols

1. **EIP-3668: CCIP Read**  
   https://eips.ethereum.org/EIPS/eip-3668

2. **ENS (Ethereum Name Service)**  
   https://ens.domains/

3. **ERC-721: Non-Fungible Token Standard**  
   https://eips.ethereum.org/EIPS/eip-721

4. **Merkle Trees**  
   https://en.wikipedia.org/wiki/Merkle_tree

### 14.2 Industry Reports

1. **Boston Consulting Group: "Tokenization of Real-World Assets" (2023)**  
   Projection: $16T market by 2030

2. **McKinsey & Company: "The Mainstreaming of Tokenized Assets" (2024)**  
   Analysis of institutional adoption trends

### 14.3 Technical Resources

1. **RWA ID GitHub**  
   https://github.com/RWA-ID/RWA-ID

2. **RWA ID Technical Overview**  
   https://www.notion.so/RWA-ID-Technical-Overview-Reference-Implementation-2f775dbae2778094a03fd6b967edbdfa

3. **RWA ID Website**  
   https://rwa-id.com

### 14.4 Related Projects

1. **ENS (Ethereum Name Service)**  
   Leading decentralized naming system

2. **Worldcoin**  
   Identity verification via biometrics (different approach)

3. **Soulbound Tokens Research (Vitalik Buterin et al.)**  
   Foundational research on non-transferable tokens

### 14.5 Legal & Compliance

1. **FATF Guidance on Virtual Assets** (2021)  
   International AML/CFT standards

2. **EU MiCA Regulation** (2023)  
   Markets in Crypto-Assets regulatory framework

3. **SEC Framework for "Investment Contract" Analysis** (2019)  
   Howey Test application to digital assets

---

## Appendix A: Glossary

**CCIP-Read (EIP-3668):** Off-chain data resolution protocol with on-chain verification

**ENS:** Ethereum Name Service - decentralized naming system for Ethereum

**Merkle Tree:** Data structure enabling efficient proof of inclusion

**Merkle Proof:** Cryptographic proof that an element is in a Merkle tree

**Soulbound Token:** Non-transferable NFT representing identity or credentials

**RWA:** Real World Asset - physical or financial asset tokenized on blockchain

**Wildcard Resolver:** ENS resolver handling entire subdomains (*.example.eth)

**Gas:** Computational cost for blockchain transactions

**Multisig:** Multi-signature wallet requiring multiple approvals

**L1/L2:** Layer 1 (Ethereum) vs Layer 2 (Linea, Base, etc.)

---

## Appendix B: FAQ

**Q: Does RWA ID perform KYC?**  
A: No. RWA ID provides infrastructure only. Platforms perform KYC and use RWA ID for identity references.

**Q: Can identities be transferred?**  
A: No. Identities are soulbound (non-transferable) to ensure stable references.

**Q: What if my wallet is compromised?**  
A: Contact your platform. They can revoke access or issue new identity to recovery wallet.

**Q: Can I claim multiple identities?**  
A: One identity per wallet per project. You can claim identities in different projects.

**Q: What chains are supported?**  
A: Ethereum, Linea, Base, Optimism, Arbitrum, Polygon. More coming.

**Q: How much does it cost?**  
A: v1: Only gas fees (~$0.10 on Linea). v2: Optional platform fees.

**Q: Is my personal information stored?**  
A: No. Only wallet addresses and chosen pseudonyms.

**Q: Can anyone see my identity?**  
A: Yes. Identities are public like ENS domains.

**Q: What if RWA ID shuts down?**  
A: Identities continue working. Contracts are immutable. Gateway is open-source.

---

## Appendix C: Contact Information

**General Inquiries:**  
Email: partner@rwa-id.com  
Website: https://rwa-id.com

**Technical Support:**  
GitHub: https://github.com/RWA-ID/RWA-ID  
Documentation: [Technical Overview](https://www.notion.so/RWA-ID-Technical-Overview-Reference-Implementation-2f775dbae2778094a03fd6b967edbdfa)

**Founder:**  
Hector Morel  
Email: partner@rwa-id.com

**Social Media:**  
[To be announced]

**Press Inquiries:**  
[To be announced]

---

**Document Version:** 1.0  
**Last Updated:** February 2025  
**Authors:** RWA ID Team  
**License:** Copyright © 2025 RWA ID. All rights reserved.

---

*This whitepaper is for informational purposes only and does not constitute investment advice, financial advice, trading advice, or any other sort of advice. RWA ID does not guarantee the accuracy or completeness of any information provided herein.*
