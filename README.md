# RWA ID

> Human-Readable Identity Infrastructure for Tokenized Real World Assets

[![Website](https://img.shields.io/badge/Website-rwa--id.com-00BCD4?style=flat-square)](https://rwa-id.com)
[![Whitepaper](https://img.shields.io/badge/Whitepaper-Read-00BCD4?style=flat-square)](https://github.com/rwa-id/RWA-ID/blob/main/whitepaper.md)
[![Technical Docs](https://img.shields.io/badge/Technical-Overview-00BCD4?style=flat-square)](https://www.notion.so/RWA-ID-Technical-Overview-Reference-Implementation-2f775dbae2778094a03fd6b967edbdfa)
[![Status](https://img.shields.io/badge/Status-Live%20on%20Linea-success?style=flat-square)](https://rwa-id.com)

**RWA ID** is a non-custodial identity layer that enables RWA platforms to issue human-readable, soulbound ENS subdomains for clients, tokenized assets, and issuers. Built on proven Web3 standards (ENS + EIP-3668 CCIP-Read), RWA ID provides universal identity resolution across wallets and dApps.

```
joe.test.rwa-id.eth
```

---

## 🎯 Problem

RWA platforms today face critical identity infrastructure challenges:

- **Opaque wallet addresses** create poor user experience
- **Fragmented identities** across chains hinder interoperability
- **No shared infrastructure** forces every platform to build internally
- **Poor legibility** for assets and participants reduces institutional trust

**Result:** Every platform builds identity systems independently. Nothing interoperates.

---

## ✨ Solution

RWA ID provides neutral, shared identity infrastructure that:

- ✅ **Issues human-readable names** (e.g., `alice.securitize.rwa-id.eth`)
- ✅ **Works across all major chains** (Ethereum, Linea, Base, Optimism, Arbitrum, Polygon)
- ✅ **Resolves in all major wallets** (MetaMask, Trust, Rainbow, Uniswap)
- ✅ **Requires no custody** or personal data collection
- ✅ **Uses proven standards** (ENS + EIP-3668)

---

## 🚀 Status

**v1 is live on Linea mainnet** (15 days in production)

- ✅ Production-ready smart contracts deployed
- ✅ Platform creation and CSV upload functional
- ✅ Client claiming portal operational
- ✅ Multi-chain resolution working
- 🔄 Currently seeking design partner platforms

---

## 📋 How It Works

### For Platforms (5-Step Integration)

1. **Create Project Namespace**
   - Platform connects wallet at [rwa-id.com](https://rwa-id.com)
   - Registers namespace (e.g., `yourplatform.rwa-id.eth`)
   - One-time cost: **0.0005 ETH**

2. **Upload Allowlist**
   - Submit CSV mapping names to wallet addresses
   - Format: `name,address`

3. **Set Merkle Root**
   - System computes Merkle root from allowlist
   - Root is committed on-chain for verifiable claims
   - No pre-minting required

4. **Clients Claim Identities**
   - Users visit [rwa-id.com/claim](https://rwa-id.com/claim)
   - Connect wallet and auto-detect eligibility
   - Pay minimal gas (< $0.10 on Linea)

5. **Universal Resolution**
   - Identities resolve immediately across all supported chains and wallets
   - Format: `client.yourplatform.rwa-id.eth`

### Example: Verifying Client Eligibility

Platforms can verify client membership on-chain using Merkle proofs:

```solidity
// Pseudocode for client eligibility verification
function verifyClient(
    bytes32[] calldata proof,
    address clientAddress,
    string calldata name
) public view returns (bool) {
    // Compute leaf node from client data
    bytes32 leaf = keccak256(abi.encodePacked(name, clientAddress));
    
    // Verify Merkle proof against stored root
    bytes32 merkleRoot = projectMerkleRoots[projectId];
    
    return MerkleProof.verify(proof, merkleRoot, leaf);
}

// Example usage
require(
    verifyClient(proof, msg.sender, "client"),
    "Client not eligible for this platform"
);
```

This approach minimizes gas costs by avoiding on-chain storage of all client addresses.

---

## 📡 Deployed Contracts

### Linea Mainnet

| Contract | Address | Purpose |
|----------|---------|---------|
| **Core Contract** | [`0x74aaCeff8139c84433befB922a8E687B6ba51F3a`](https://lineascan.build/address/0x74aaCeff8139c84433befB922a8E687B6ba51F3a) | Project creation, Merkle root management, claims |
| **ENS Wildcard Resolver** | [`0x188a60a8bC5Df96CD12C64FBAf166075a5029c80`](https://lineascan.build/address/0x188a60a8bC5Df96CD12C64FBAf166075a5029c80) | EIP-3668 CCIP-Read resolver for identity resolution |

### CCIP-Read Gateway

**Gateway URL:** `https://gateway.rwa-id.com/{sender}/{data}.json`

The resolver implements [EIP-3668 (CCIP-Read)](https://eips.ethereum.org/EIPS/eip-3668) to enable off-chain computation with on-chain verification, allowing efficient resolution of identities across the ENS ecosystem.

### Example Working Name

Try resolving in any supported wallet:
```
joe.test.rwa-id.eth
```

---

## 🌐 Multi-Chain Support

RWA ID identities resolve across multiple networks:

| Network | Status | Chain ID |
|---------|--------|----------|
| Ethereum | ✅ Live | 1 |
| Linea | ✅ Live | 59144 |
| Base | ✅ Live | 8453 |
| Optimism | ✅ Live | 10 |
| Arbitrum | ✅ Live | 42161 |
| Polygon | ✅ Live | 137 |

### Wallet Compatibility

- MetaMask
- Trust Wallet
- Rainbow
- Uniswap Wallet
- Any ENS-compatible wallet

---

## 🏗️ Architecture

RWA ID uses a **wildcard resolver pattern** with off-chain proof verification:

```
┌─────────────┐
│   Wallet    │
│  (User)     │
└──────┬──────┘
       │ Resolve: client.platform.rwa-id.eth
       ↓
┌──────────────────┐
│  ENS Registry    │
│  (On-chain)      │
└──────┬───────────┘
       │ Wildcard Resolver: 0x188a...
       ↓
┌──────────────────┐
│ CCIP-Read        │
│ Gateway          │
│ (Off-chain)      │
└──────┬───────────┘
       │ Fetch proof + metadata
       ↓
┌──────────────────┐
│ Wallet displays: │
│ ✓ client.platform│
│   .rwa-id.eth    │
└──────────────────┘
```

For detailed technical documentation, see our [Technical Overview](https://www.notion.so/RWA-ID-Technical-Overview-Reference-Implementation-2f775dbae2778094a03fd6b967edbdfa).

---

## 💰 v2 Roadmap: Protocol-Enforced Monetization

The v2 upgrade introduces sustainable economics with fully on-chain enforcement:

### Revenue Sharing Model

```
Platform sets optional per-claim fee (e.g., $1.00 or less)
                    ↓
         Protocol enforces split:
         ┌────────────────────┐
         │   70% → Platform   │
         │   30% → RWA ID     │
         └────────────────────┘
```

**Key Benefits:**
- ✅ No off-chain accounting required
- ✅ No trust assumptions between parties
- ✅ Fully automated revenue distribution
- ✅ Transparent and verifiable on-chain

### v2 Timeline

Before rolling out v2 broadly, we are seeking **at least one production RWA platform partner** to:
- Validate technical integration flow
- Refine UX based on actual usage patterns
- Gather feedback on monetization models
- Build case studies for subsequent integrators

---

## 🔒 Regulatory Posture

RWA ID operates as **infrastructure only** with minimal regulatory surface area:

| What RWA ID **Does** | What RWA ID **Does NOT Do** |
|---------------------|---------------------------|
| ✅ Provide identity references | ❌ Collect personal data |
| ✅ Enable human-readable names | ❌ Perform KYC/verification |
| ✅ Facilitate on-chain resolution | ❌ Assert identity claims |
| ✅ Support platform operations | ❌ Custody funds or assets |

**Platforms retain full responsibility** for compliance, user verification, and regulatory obligations within their jurisdictions.

---

## 🚦 Getting Started

### For Platforms

1. **Visit:** [rwa-id.com](https://rwa-id.com)
2. **Connect:** Your platform wallet
3. **Create:** Your project namespace
4. **Upload:** CSV with client names and addresses
5. **Deploy:** Share claim portal with your clients

### For Developers

```bash
# Clone the repository
git clone https://github.com/RWA-ID/RWA-ID.git
cd RWA-ID

# Read the technical documentation
open whitepaper.md
```

**Key Resources:**
- [Whitepaper](https://github.com/rwa-id/RWA-ID/blob/main/whitepaper.md)
- [Technical Overview](https://www.notion.so/RWA-ID-Technical-Overview-Reference-Implementation-2f775dbae2778094a03fd6b967edbdfa)
- [Live Demo](https://rwa-id.com)

---

## 🤝 Partnership Opportunities

We are actively seeking **design partner platforms** to shape v2 development:

### Ideal Partners
- RWA platforms ready for production deployment
- Organizations seeking enterprise identity solutions
- Technical partners for multi-chain expansion

### What We Offer Design Partners
- Early access to v2 features
- Direct influence on protocol development
- Technical integration support
- Co-marketing opportunities

**Interested?** Reach out to [partner@rwa-id.com](mailto:partner@rwa-id.com)

---

## 📞 Contact

**Founder:** Hector Morel  
**Email:** [partner@rwa-id.com](mailto:partner@rwa-id.com)  
**Website:** [rwa-id.com](https://rwa-id.com)  
**Documentation:** [Technical Overview](https://www.notion.so/RWA-ID-Technical-Overview-Reference-Implementation-2f775dbae2778094a03fd6b967edbdfa)

---

## 📄 License

MIT

---

## 🙏 Built With

- [ENS (Ethereum Name Service)](https://ens.domains/)
- [EIP-3668 (CCIP-Read)](https://eips.ethereum.org/EIPS/eip-3668)
- [Linea Network](https://linea.build/)
- [Merkle Proofs](https://en.wikipedia.org/wiki/Merkle_tree)

---

<div align="center">

**RWA ID** — Identity Infrastructure for the Tokenized Economy

[Website](https://rwa-id.com) • [Whitepaper](https://github.com/rwa-id/RWA-ID/blob/main/whitepaper.md) • [Technical Docs](https://www.notion.so/RWA-ID-Technical-Overview-Reference-Implementation-2f775dbae2778094a03fd6b967edbdfa) • [Contact](mailto:partner@rwa-id.com)

</div>

