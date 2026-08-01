# RWA ID

> Human-Readable Identity Infrastructure for Tokenized Real World Assets

[![Website](https://img.shields.io/badge/Website-rwa--id.com-00BCD4?style=flat-square)](https://rwa-id.com)
[![Whitepaper](https://img.shields.io/badge/Whitepaper-Read-00BCD4?style=flat-square)](https://github.com/rwa-id/RWA-ID/blob/main/whitepaper.md)
[![Technical Docs](https://img.shields.io/badge/Technical-Overview-00BCD4?style=flat-square)](https://www.notion.so/RWA-ID-Technical-Overview-Reference-Implementation-2f775dbae2778094a03fd6b967edbdfa)
[![Status](https://img.shields.io/badge/Status-Live%20on%20Mainnet-success?style=flat-square)](https://rwa-id.com)

**RWA ID** is a non-custodial identity layer that enables RWA platforms to issue human-readable, soulbound or transferable ENS subdomains for clients wallets, tokenized assets, and issuers. Built on proven Web3 standards (ENS + EIP-3668 CCIP-Read), RWA ID provides universal identity resolution across wallets and dApps.

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

**v3 is live on Ethereum mainnet** — deployed 1 Aug 2026, block 25661280

- ✅ Production contracts deployed and verified on Etherscan
- ✅ Governed by a 2-of-3 Safe multisig ([details](#-governance))
- ✅ 25 top RWA platform slugs reserved ([list](#-reserved-namespaces))
- ✅ Identity NFTs render name + artwork fully on-chain ([details](#-token-metadata))
- ✅ CCIP-Read gateway live at `gateway.rwa-id.com`, pointed at v3
- ✅ ENS wildcard resolver active — names resolve in MetaMask & Trust Wallet
- ✅ Platform identity management dashboard operational

### What changed in v3

v2 never implemented `tokenURI()`, so every identity appeared on marketplaces as an
untitled, imageless *"RWA ID #n"*. That could not be patched — v2 has no baseURI
setter and is not behind a proxy — so v3 was deployed to replace it.

| | v2 | v3 |
|---|---|---|
| Token metadata | none — `tokenURI()` returned `""` | name, description, artwork and traits, rendered on-chain |
| `claim()` takes | `bytes32 nameHash` | `string label` — so the contract can name what it mints |
| Label casing | any bytes accepted | lowercase `[a-z0-9-_]` enforced |
| Collection metadata | none | `contractURI()`, plus ERC-4906 update signalling |

**Existing allowlists carry over.** The Merkle leaf is unchanged —
`keccak256(claimer, keccak256(bytes(label)))` — so roots and proof sets generated for
v2 verify against v3 without regenerating anything.

---

## 📋 How It Works

### For Platforms (3-Step Integration)

1. **Create Project Namespace**
   - Platform connects wallet at [rwa-id.com](https://rwa-id.com)
   - Registers namespace (e.g., `test.rwa-id.eth`) — free to create
   - Optionally sets a USDC claim fee (70% goes to platform treasury 30% to RWA ID)

2. **Upload Allowlist**
   - Submit CSV mapping names to wallet addresses (two columns: `name,wallet`)
   - Names must be lowercase `[a-z0-9-_]` — see [Label rules](#label-rules)
   - System computes the Merkle root in the browser, commits it on-chain, and pins the
     proofs to IPFS via Pinata. Only the root goes on-chain, so client lists never
     touch a server the platform does not control
   - A shareable claim URL is generated automatically:
     `rwa-id.com/?claim=[projectId]&proofs=[cid]`

3. **Clients Claim Identities**
   - Platform shares the claim URL with clients (email, dashboard, etc.)
   - Client opens the URL — their wallet is auto-detected from the proof file, no manual input needed
   - Client approves USDC and confirms the claim in two wallet steps
   - Identity NFT minted — resolves immediately across all ENS wallets, and displays
     as `client.yourplatform.rwa-id.eth` on marketplaces
   - Format: `client.yourplatform.rwa-id.eth`

### Label rules

Labels are restricted to lowercase `[a-z0-9-_]`, 1–63 characters, and the contract
rejects anything else at claim time rather than silently normalising it.

This is not cosmetic. The CCIP-Read gateway lowercases a name before hashing it, so
under v2 a client allowlisted as `Zac` minted at `keccak("Zac")` while ENS looked up
`keccak("zac")` — the claim succeeded, nothing errored, and the identity was
permanently unresolvable. The contract cannot fold the case itself, because the
Merkle leaf is built from the raw bytes off-chain and rewriting them would invalidate
every proof. So it rejects instead, and the dashboard normalises when building the
tree. The same character set is what keeps on-chain rendering safe, since `tokenURI()`
interpolates the label into both JSON and SVG.

### Revenue Sharing Model

Every claim pays a USDC fee — always split 70/30 on-chain between the platform treasury and RWA ID. The fee amount depends on whether the platform set one:

| Scenario | Effective Fee | Platform (70%) | RWA ID (30%) |
|----------|--------------|----------------|--------------|
| Platform sets no fee | $0.50 minimum enforced by contract | $0.35 | $0.15 |
| Platform sets $1.00 | $1.00 | $0.70 | $0.30 |
| Platform sets $5.00 | $5.00 | $3.50 | $1.50 |

The $0.50 minimum is enforced at the contract level — it cannot be bypassed. If a platform sets `claimFee = 0`, the contract automatically applies the minimum and distributes it with the same 70/30 split.

---

## 📡 Deployed Contracts

### Ethereum Mainnet

| Contract | Address | |
|----------|---------|---|
| **RWAIDv3** | [`0x6413e9E6A0D4e05557463A66C34E18192324A2C7`](https://etherscan.io/address/0x6413e9E6A0D4e05557463A66C34E18192324A2C7) | current registry |
| **Wildcard Resolver v2** | [`0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1`](https://etherscan.io/address/0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1) | unchanged by the v3 cutover |
| **Protocol Safe** | [`0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab`](https://etherscan.io/address/0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab) | owner + protocol treasury |
| **USDC** | [`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`](https://etherscan.io/address/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) | |
| RWAIDv2 | [`0xD0B565C7134bDB16Fc3b8A9Cb5fdA003C37930c2`](https://etherscan.io/address/0xD0B565C7134bDB16Fc3b8A9Cb5fdA003C37930c2) | superseded — no token metadata |

The resolver did **not** need redeploying for the v3 cutover: it stores no registry
address, and `resolveWithProof` only checks that the gateway's response was signed by
`trustedSigner`. Repointing the protocol at a new registry is a gateway configuration
change.

### Sepolia Testnet

| Contract | Address |
|----------|---------|
| **RWAIDv2** | [`0xb0b023c9eD18dCD573B8befC851974f20126ab92`](https://sepolia.etherscan.io/address/0xb0b023c9eD18dCD573B8befC851974f20126ab92) |
| **Wildcard Resolver v2** | [`0xE591Cbe3802e3E4908731E3D4B056cd8b08AE520`](https://sepolia.etherscan.io/address/0xE591Cbe3802e3E4908731E3D4B056cd8b08AE520) |
| **MockUSDC** | [`0x4CcF36b273dA06D70B235d605639b3f8a6CA6B03`](https://sepolia.etherscan.io/address/0x4CcF36b273dA06D70B235d605639b3f8a6CA6B03) |

### CCIP-Read Gateway

**Gateway URL:** `https://gateway.rwa-id.com/{sender}/{data}.json`

The resolver implements [EIP-3668 (CCIP-Read)](https://eips.ethereum.org/EIPS/eip-3668) to enable off-chain resolution lookups with on-chain signature verification.

The gateway reads the registry and signs each answer with the trusted signer key
registered on the resolver (`0xC9fACcf3a77b553375017efFEe441D9770fAA723`). Rotating
that key requires a Safe transaction calling `setTrustedSigner` — until that lands,
rotating it alone would break resolution for every name.

---

## 🔐 Governance

Both the registry and the protocol treasury are controlled by a **2-of-3 Safe
multisig** (Safe v1.4.1) at
[`0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab`](https://app.safe.global/home?safe=eth:0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab).

| | |
|---|---|
| Threshold | 2 of 3 signers |
| Owns | RWAIDv3 (`owner`) and the protocol fee treasury |
| Cannot | touch platform treasuries, seize identities, or move client funds |

### What requires the multisig

| Function | Effect |
|---|---|
| `reserveNamespace` / `batchReserveNamespaces` | Reserve a slug for a platform |
| `releaseNamespace` | Release a reservation early |
| `setMinimumClaimFee` | Change the protocol-wide fee floor (currently $0.50) |
| `setProtocolFeePercent` | Change the protocol split (currently 30%, bounded 10–50% by the contract) |
| `setProtocolTreasury` | Redirect the protocol's share of fees |
| `setBaseURI` / `setContractURI` | Repoint artwork away from the on-chain renderer |

Everything a **platform** does — creating a project, publishing an allowlist, setting
its own claim fee and treasury, pausing, revoking — is controlled by that platform's
own wallet and needs no protocol involvement.

### Proposing a multisig transaction

```bash
# Dry run — prints the slugs, calldata and Safe tx hash, signs nothing
npx hardhat run scripts/reserve-slugs-v3.js --network mainnet

# Sign and queue it for the other owners to approve
SUBMIT=1 npx hardhat run scripts/reserve-slugs-v3.js --network mainnet
```

Owners then approve and execute at
[app.safe.global](https://app.safe.global/transactions/queue?safe=eth:0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab).

> **Note:** the Safe UI may show freshly-verified contract calls as raw hex rather
> than a decoded function name. Before approving, confirm the target is the registry,
> `value` is 0, and the operation is `CALL` — never `DELEGATECALL`.

---

## 🏷️ Reserved Namespaces

25 RWA platform slugs are reserved on v3 until **1 August 2027**. Reservations are
held at `0x0000000000000000000000000000000000000001` — an address nobody controls — so
the namespace is locked against squatters until the real platform claims it.

| Category | Reserved slugs |
|----------|----------------|
| Institutional / securities | `securitize` `ondo` `superstate` `backed` `archax` |
| Credit / lending | `centrifuge` `maple` `goldfinch` `credix` `clearpool` |
| Real estate | `realt` `lofty` `propy` `homebase` `tangible` |
| Infrastructure / compliance | `polymesh` `tokeny` `realio` `defactor` `fasset` |
| Commodities / funds | `openeden` `swarm` `bitbond` `finblox` `parcl` |

**If one of these is yours:** [get in touch](#-contact) and the Safe will reassign the
reservation to your wallet with `reserveNamespace(slug, yourWallet, duration)`. You can
then create the project yourself — no other party can take the name in the meantime.

**Any other slug is open** and can be registered permissionlessly at
[rwa-id.com](https://rwa-id.com). Reservations are not permanent: `createProject`
deletes an expired reservation and lets the next caller through, so anything not
claimed by August 2027 becomes available.

---

## 🖼️ Token Metadata

Every v3 identity renders its own metadata on-chain — no metadata server, no IPFS
dependency, nothing to keep alive:

```
name        alice.acme.rwa-id.eth
image       on-chain SVG — the RWA·ID mark over the full name
attributes  Namespace · Label · Project ID · Transferability · Claimed (date)
```

`contractURI()` supplies collection-level metadata to marketplaces the same way.
`setBaseURI` and `setContractURI` exist as escape hatches if artwork should later
point elsewhere; setting a baseURI takes precedence over the on-chain renderer, and
emits ERC-4906 so marketplaces re-read.

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
       │ resolveAddr(node) on RWAIDv3
       │   → ownerOf(nodeToTokenId[node]), so a transfer
       │     is reflected without re-registering anything
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
npx hardhat test test/RWAIDv2.test.js     # 68 passing
```

The v2 suite covers the registry logic v3 inherits unchanged — projects, allowlists,
fee splitting, soulbound enforcement, revocation, CCIP-Read. **v3's own additions
(on-chain `tokenURI`, label validation, the label-carrying `claim`) have no unit suite
yet** and are exercised by a verification script instead:

```bash
npx hardhat run scripts/v3-metadata-check.js
```

It deploys v3 locally, publishes a real v2-era Merkle root unchanged, claims against
it with the original proofs, decodes the resulting `tokenURI`, and asserts that
malformed labels — dots, uppercase, spaces, JSON and SVG injection — are rejected.
Writing proper unit tests for v3 is outstanding work.

> `npx hardhat test` with no arguments also picks up `test/rwaIdRegistry.test.js`, a
> legacy v1 suite that fails on a constructor signature change. That predates v3 and
> does not affect the deployed contracts.

### Deploy

```bash
npx hardhat run scripts/deploy-v3.js --network mainnet    # dry-runs locally without --network
```

Prints the deployed address, the block to use as the log-scan start, and the
follow-up steps (gateway env var, dashboard constant, Etherscan verification).

### Guard the dashboard ABI

```bash
npx hardhat compile && node scripts/check-dashboard-abi.mjs
```

The console declares its own ABI rather than importing artifacts, so a signature
change can pass a build and only fail in a user's wallet. This diffs the two.

---

## 📦 Repository Structure

```
contracts/
  RWAIDv3.sol                    — Current registry (adds on-chain token metadata)
  RWAIDv2.sol                    — Superseded registry (no tokenURI)
  RwaIdWildcardResolverV2.sol    — ENSIP-10 wildcard resolver (CCIP-Read / EIP-3668)
  mocks/MockUSDC.sol             — Test USDC (Sepolia only)
  RwaIdRegistry.sol              — v1 contract (legacy)
  RwaIdWildcardResolver.sol      — v1 resolver (legacy)
scripts/
  deploy-v3.js                   — Deploy RWAIDv3
  deploy-mainnet.js              — Deploy v2 (historical)
  deploy-sepolia.js              — Deploy to Sepolia testnet
  reserve-slugs-v3.js            — Queue v3 slug reservations in the Safe
  reserve-slugs.js               — v2 equivalent (historical)
  verify-reservations.js         — Verify reserved slugs on-chain
  set-trusted-signer.js          — Update gateway signer via Safe multisig
  v3-metadata-check.js           — Verify v3 metadata + v2 allowlist compatibility
  check-dashboard-abi.mjs        — Diff the console's ABI against the compiled contract
test/
  RWAIDv2.test.js                — 68 contract tests
apps/
  rwa-id-dashboard/              — Platform console (own repo: RWA-ID/RWA-ID-Dashboard)
packages/
  rwaid-gateway/                 — CCIP-Read gateway (deployed on Replit; not tracked here)
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

[Website](https://rwa-id.com) • [Whitepaper](whitepaper.md) • [Technical Docs](https://www.notion.so/RWA-ID-Technical-Overview-Reference-Implementation-v2-4563759f55214aa7989dbb882ef08e47?source=copy_link) • [Contact](mailto:partner@rwa-id.com)

</div>
