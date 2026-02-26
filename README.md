# RWA ID

> Human-Readable Identity Infrastructure for Tokenized Real World Assets

[![Website](https://img.shields.io/badge/Website-rwa--id.com-00BCD4?style=flat-square)](https://rwa-id.com)
[![Whitepaper](https://img.shields.io/badge/Whitepaper-Read-00BCD4?style=flat-square)](https://github.com/rwa-id/RWA-ID/blob/main/whitepaper.md)
[![Technical Docs](https://img.shields.io/badge/Technical-Overview-00BCD4?style=flat-square)](https://www.notion.so/RWA-ID-Technical-Overview-Reference-Implementation-2f775dbae2778094a03fd6b967edbdfa)
[![Status](https://img.shields.io/badge/Status-Live%20on%20Mainnet-success?style=flat-square)](https://rwa-id.com)

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

- ✅ **Issues human-readable names** (e.g., `joe.test.rwa-id.eth`)
- ✅ **Resolves in all major wallets** (MetaMask, Trust, Rainbow, Uniswap)
- ✅ **USDC claim fees** with automatic 70/30 platform/protocol split on-chain
- ✅ **Soulbound or transferable** — configurable per project
- ✅ **Requires no custody** or personal data collection
- ✅ **Uses proven standards** (ENS + EIP-3668 CCIP-Read)

---

## 🚀 Status

**v2 is live on Ethereum mainnet**

- ✅ Production contracts deployed and verified on Etherscan
- ✅ 25 top RWA platform slugs reserved
- ✅ CCIP-Read gateway live at `gateway.rwa-id.com`
- ✅ ENS wildcard resolver active — names resolve in MetaMask & Trust Wallet
- ✅ Platform console and client claim portal operational

---

## 📋 How It Works

### For Platforms (3-Step Integration)

1. **Create Project Namespace**
   - Platform connects wallet at [rwa-id.com](https://rwa-id.com)
   - Registers namespace (e.g., `test.rwa-id.eth`) — free to create
   - Optionally sets a USDC claim fee (70% goes to platform treasury)

2. **Upload Allowlist**
   - Submit CSV mapping names to wallet addresses
   - System computes Merkle root and commits it on-chain

3. **Clients Claim Identities**
   - Users visit the claim portal, connect wallet, pay optional USDC fee
   - Identity NFT minted — resolves immediately across all ENS wallets
   - Format: `client.yourplatform.rwa-id.eth`

### Revenue Sharing Model

```
Platform sets optional per-claim fee (e.g., $1.00 USDC)
                    ↓
         Protocol enforces split on-chain:
         ┌────────────────────┐
         │   70% → Platform   │
         │   30% → RWA ID     │
         └────────────────────┘
```

---

## 📡 Deployed Contracts

### Ethereum Mainnet

| Contract | Address |
|----------|---------|
| **RWAIDv2** | [`0xD0B565C7134bDB16Fc3b8A9Cb5fdA003C37930c2`](https://etherscan.io/address/0xD0B565C7134bDB16Fc3b8A9Cb5fdA003C37930c2) |
| **Wildcard Resolver v2** | [`0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1`](https://etherscan.io/address/0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1) |
| **USDC** | [`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`](https://etherscan.io/address/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) |

### Sepolia Testnet

| Contract | Address |
|----------|---------|
| **RWAIDv2** | [`0xb0b023c9eD18dCD573B8befC851974f20126ab92`](https://sepolia.etherscan.io/address/0xb0b023c9eD18dCD573B8befC851974f20126ab92) |
| **Wildcard Resolver v2** | [`0xE591Cbe3802e3E4908731E3D4B056cd8b08AE520`](https://sepolia.etherscan.io/address/0xE591Cbe3802e3E4908731E3D4B056cd8b08AE520) |
| **MockUSDC** | [`0x4CcF36b273dA06D70B235d605639b3f8a6CA6B03`](https://sepolia.etherscan.io/address/0x4CcF36b273dA06D70B235d605639b3f8a6CA6B03) |

### CCIP-Read Gateway

**Gateway URL:** `https://gateway.rwa-id.com/{sender}/{data}.json`

The resolver implements [EIP-3668 (CCIP-Read)](https://eips.ethereum.org/EIPS/eip-3668) to enable off-chain resolution lookups with on-chain signature verification.

---

## 🏗️ Architecture

```
┌─────────────┐
│   Wallet    │
│  (User)     │
└──────┬──────┘
       │ Resolve: joe.test.rwa-id.eth
       ↓
┌──────────────────┐
│  ENS Registry    │
│  (Ethereum)      │
└──────┬───────────┘
       │ Wildcard Resolver → 0x765F...
       ↓
┌──────────────────┐
│ CCIP-Read        │
│ Gateway          │
│ gateway.rwa-id.com│
└──────┬───────────┘
       │ Looks up nodeToTokenId + ownerOf in RWAIDv2
       │ Returns signed (node, address, hash, sig)
       ↓
┌──────────────────┐
│ resolveWithProof │
│ verifies sig     │
│ returns address  │
└──────────────────┘
```

---

## 🛠️ Developer Setup

```bash
git clone https://github.com/RWA-ID/RWA-ID.git
cd RWA-ID
npm install
cp .env.example .env   # fill in your keys
```

### Run Tests

```bash
npx hardhat test
```

68 tests — all passing.

### Deploy to Sepolia

```bash
npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

### Deploy to Mainnet

```bash
npx hardhat run scripts/deploy-mainnet.js --network mainnet
```

---

## 📦 Repository Structure

```
contracts/
  RWAIDv2.sol                    — Main v2 registry (ERC-721 + USDC fees + Merkle allowlist)
  RwaIdWildcardResolverV2.sol    — ENSIP-10 wildcard resolver (CCIP-Read / EIP-3668)
  mocks/MockUSDC.sol             — Test USDC (Sepolia only)
  RwaIdRegistry.sol              — v1 contract (legacy)
  RwaIdWildcardResolver.sol      — v1 resolver (legacy)
scripts/
  deploy-mainnet.js              — Deploy to Ethereum mainnet
  deploy-sepolia.js              — Deploy to Sepolia testnet
  reserve-slugs.js               — Propose slug reservations via Safe multisig
  verify-reservations.js         — Verify reserved slugs on-chain
  set-trusted-signer.js          — Update gateway signer via Safe multisig
test/
  RWAIDv2.test.js                — 68 contract tests
```

---

## 🔒 Regulatory Posture

RWA ID operates as **infrastructure only** with minimal regulatory surface area:

| What RWA ID **Does** | What RWA ID **Does NOT Do** |
|---------------------|---------------------------|
| ✅ Provide identity references | ❌ Collect personal data |
| ✅ Enable human-readable names | ❌ Perform KYC/verification |
| ✅ Facilitate on-chain resolution | ❌ Assert identity claims |
| ✅ Support platform operations | ❌ Custody funds or assets |

---

## 📞 Contact

**Founder:** Hector Morel
**Email:** [partner@rwa-id.com](mailto:partner@rwa-id.com)
**Website:** [rwa-id.com](https://rwa-id.com)

---

## 📄 License

MIT

---

## 🙏 Built With

- [ENS (Ethereum Name Service)](https://ens.domains/)
- [EIP-3668 (CCIP-Read)](https://eips.ethereum.org/EIPS/eip-3668)
- [OpenZeppelin Contracts v5](https://github.com/OpenZeppelin/openzeppelin-contracts)
- [Ethereum](https://ethereum.org/)

---

<div align="center">

**RWA ID** — Identity Infrastructure for the Tokenized Economy

[Website](https://rwa-id.com) • [Whitepaper](whitepaper.md) • [Technical Docs](https://www.notion.so/RWA-ID-Technical-Overview-Reference-Implementation-2f775dbae2778094a03fd6b967edbdfa) • [Contact](mailto:partner@rwa-id.com)

</div>
