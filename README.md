# RWA ID

> Readable ENS names for the client wallets of tokenized-asset platforms

[![Website](https://img.shields.io/badge/Website-rwa--id.com-CCFF00?style=flat-square&labelColor=0B0C0A)](https://rwa-id.com)
[![Docs](https://img.shields.io/badge/Docs-rwa--id.com%2Fdocs-CCFF00?style=flat-square&labelColor=0B0C0A)](https://rwa-id.com/docs)
[![Whitepaper](https://img.shields.io/badge/Whitepaper-Read-CCFF00?style=flat-square&labelColor=0B0C0A)](whitepaper.md)
[![Chain](https://img.shields.io/badge/Registry-Robinhood%20Chain%204663-FF5A1F?style=flat-square&labelColor=0B0C0A)](https://robinhoodchain.blockscout.com/address/0x85B09167aB330641f8e5F73E2e904C75FDFa8132)

**RWA ID** is a non-custodial identity layer for real-world-asset platforms. A
platform registers a namespace, allowlists its clients, and each client wallet
claims a name like:

```
joe.yourplatform.rwa-id.eth
```

Every name is a real ENS name backed by an ERC-721 token. The registry lives on
**Robinhood Chain**; names resolve through the standard ENS path on **Ethereum**
(ENSIP-10 wildcard + EIP-3668 CCIP-Read), so they work in MetaMask, Coinbase
Wallet, Rainbow, Uniswap, Trust, Zerion, Ledger, Safe and any other app that reads
`.eth`, with no SDK and no integration.

RWA ID never collects personal data, performs KYC, asserts identity claims or
custodies assets.

---

## Contents

- [Status](#-status)
- [Deployed contracts](#-deployed-contracts)
- [How it works](#-how-it-works)
- [Fees and sponsorship](#-fees-and-sponsorship)
- [Names, records and resolution](#-names-records-and-resolution)
- [Identity NFTs and artwork](#-identity-nfts-and-artwork)
- [Reserved namespaces](#-reserved-namespaces)
- [The RWAIDRH token](#-the-rwaidrh-token)
- [Governance](#-governance)
- [Architecture](#-architecture)
- [Developer setup](#-developer-setup)
- [Repository structure](#-repository-structure)
- [Version history](#-version-history)
- [Regulatory posture](#-regulatory-posture)
- [Contact](#-contact)

---

## 🚀 Status

**v4.1 is live on Robinhood Chain (chain id 4663)** since 13 October 2026.

- ✅ Registry **RWAIDv4.1** deployed, verified on Blockscout, owned by the protocol Safe
- ✅ Claim fees in **USDG**, with a real 0.50 USDG floor and a 70/30 on-chain split
- ✅ **Sponsor pools** and **`claimFor`**: platforms can pay for, and deliver, their clients' names
- ✅ **Platform artwork**: one image per namespace, or the on-chain RWA ID identity card
- ✅ **RWAIDRecords**: holders add Bitcoin, Solana, other-chain addresses and text records
- ✅ **New Ethereum resolver** for `rwa-id.eth`: every gateway answer is signature-bound and expires within an hour
- ✅ **36 namespaces reserved** until 12 October 2029
- ✅ **RWAIDRH token** launched 14 October 2026, with launch liquidity permanently locked
- ✅ Site, console and docs at [rwa-id.com](https://rwa-id.com) and [dashboard.rwa-id.com](https://dashboard.rwa-id.com)
- ✅ Names issued under **v3 on Ethereum keep resolving**

---

## 📡 Deployed contracts

Every address is also recorded in
[`protocol/deployments/robinhood.json`](protocol/deployments/robinhood.json).

### Robinhood Chain (4663) — registry, records, token

| Contract | Address | Role |
|---|---|---|
| **RWAIDv4.1** | [`0x85B09167aB330641f8e5F73E2e904C75FDFa8132`](https://robinhoodchain.blockscout.com/address/0x85B09167aB330641f8e5F73E2e904C75FDFa8132) | Registry: namespaces, allowlists, identity NFTs, fees, sponsor pools. Block 87872447 |
| **RWAIDRecords** | [`0xb209023C4C4D5c997dEb6A2E672374e358182F37`](https://robinhoodchain.blockscout.com/address/0xb209023C4C4D5c997dEb6A2E672374e358182F37) | Per-name addresses on other chains and text records. Ownerless |
| **USDG** | [`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`](https://robinhoodchain.blockscout.com/address/0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168) | Claim-fee token (Paxos, 6 decimals) |
| **Protocol Safe** | [`0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab`](https://robinhoodchain.blockscout.com/address/0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab) | 2-of-3 owner and protocol treasury (same address on Ethereum) |
| **RWAIDRH token** | [`0xdd0A628926C0C944A603eD93bca325161cD4efc6`](https://robinhoodchain.blockscout.com/token/0xdd0A628926C0C944A603eD93bca325161cD4efc6) | RWA IDENTITY, 50B supply, no owner, no mint |
| RWAIDLiquidityLock | [`0x91442eda74bD0d3D0965F058d74c75A6f7E1308f`](https://robinhoodchain.blockscout.com/address/0x91442eda74bD0d3D0965F058d74c75A6f7E1308f) | Holds LP position #1442175 forever; fees to the Safe |
| RWAIDPlatformUnlock | [`0x6709D7b104B7283fac92DBbD9AFbd90Af7c233F0`](https://robinhoodchain.blockscout.com/address/0x6709D7b104B7283fac92DBbD9AFbd90Af7c233F0) | 36 platform token buckets. Owned by the Safe |
| Founder VestingWallet | [`0x0A048950f66C14b517DF6B02F04f8db2d9F9f91d`](https://robinhoodchain.blockscout.com/address/0x0A048950f66C14b517DF6B02F04f8db2d9F9f91d) | OpenZeppelin VestingWallet, 14 Oct 2027 → 13 Oct 2030 |
| Uniswap v3 pool | [`0xe03f2d01Ca196B80C1048c7FC0213322400D05D3`](https://robinhoodchain.blockscout.com/address/0xe03f2d01Ca196B80C1048c7FC0213322400D05D3) | WETH / RWAIDRH, 1% fee tier |
| RWAIDLauncher | [`0xA36c2328dBcB408D23De5993b25C29aD1f806262`](https://robinhoodchain.blockscout.com/address/0xA36c2328dBcB408D23De5993b25C29aD1f806262) | One-shot launch contract; holds nothing and has no functions |

### Ethereum mainnet — ENS side

| Contract | Address | Role |
|---|---|---|
| **RwaIdOffchainResolver** | [`0x5Bf038c11A81E84795f1078A30A6eCF64fD5E5e0`](https://etherscan.io/address/0x5Bf038c11A81E84795f1078A30A6eCF64fD5E5e0) | Resolver for `rwa-id.eth` since 13 Oct 2026 (ENSIP-10 + CCIP-Read). Safe-owned, Etherscan-verified |
| Gateway signer | `0xDF8E6a113f98586608C3D7a4eab68a35A97602Af` | The only key the resolver trusts for gateway answers |
| **Protocol Safe** | [`0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab`](https://app.safe.global/home?safe=eth:0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab) | Owns the resolver and the legacy v3 registry |
| RWAIDv3 (legacy) | [`0x6413e9E6A0D4e05557463A66C34E18192324A2C7`](https://etherscan.io/address/0x6413e9E6A0D4e05557463A66C34E18192324A2C7) | The August 2026 registry. No new projects; its names still resolve |

`rwa-id.eth` itself is registered until **25 November 2031**.

### Retired

| Contract | Address | Why |
|---|---|---|
| RWAIDv4.0 | `0xb99c4333DEb732B30D83f03cAb92fe855B21999a` (Robinhood Chain) | Replaced by v4.1 the same day, before any project existed, for the relaunch NFT artwork. Nothing reads it |
| RwaIdWildcardResolverV2 | `0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1` (Ethereum) | `rwa-id.eth`'s resolver until 13 Oct 2026. Its signatures were not bound to the question or answer — see [Resolution](#-names-records-and-resolution) |
| Old gateway signer | `0xC9fACcf3a77b553375017efFEe441D9770fAA723` | Trusted only by the retired V2 resolver |
| RWAIDv2 | `0xD0B565C7134bDB16Fc3b8A9Cb5fdA003C37930c2` (Ethereum) | No `tokenURI`; superseded by v3 in August 2026 |

---

## 📋 How it works

### For platforms

Everything happens in the console at [rwa-id.com/console](https://rwa-id.com/console)
(or [dashboard.rwa-id.com](https://dashboard.rwa-id.com)), on Robinhood Chain. You
need a little ETH on Robinhood Chain for gas; each transaction costs a fraction of a
cent.

1. **Create your namespace.** `createProject(slug, treasury, claimFee, transferable)`
   registers `yourplatform.rwa-id.eth`. Creating it is free. The connecting wallet
   becomes the project owner — a Safe is the right choice for anything long-lived,
   and ownership can be transferred later with `transferProjectOwnership`.
2. **Publish an allowlist.** Upload a CSV of `name,wallet` pairs. The console builds
   the Merkle tree in your browser, pins the proof set to IPFS, and writes only the
   32-byte root on-chain with `updateMerkleRoot`. Client lists never touch an RWA ID
   server.
3. **Decide who pays.** Let clients pay the claim fee in USDG, or fund a
   [sponsor pool](#-fees-and-sponsorship) so they claim free.
4. **Share the claim link, or deliver.** Send clients
   `rwa-id.com/claim/?claim=<projectId>&proofs=<cid>&v=4`, or deliver names straight
   to their wallets with `claimFor`. A delivered name can only land in the wallet it
   was allowlisted for.

```
name,wallet
joe,0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
ana,0x8a3e2F95A120C3d0B35F46aC77B2F9A5C028dE81
```

```
leaf = keccak256(abi.encodePacked(wallet, keccak256(bytes(label))))   // unchanged since v2
```

Publishing a new root replaces the old one; names already claimed are unaffected.
To add clients, load the live proof set, append, and publish again. The claim page
checks that its proof set matches the live root, so a stale link fails with a clear
message instead of a reverted transaction.

> **Privacy:** the pinned proof set is public and permanent — it contains every name
> and wallet on the allowlist. Use pseudonymous labels rather than clients' legal
> names unless you have a lawful basis to publish them.

### For clients

1. Open the claim link from your platform. Your wallet is detected from the proof set.
2. Confirm the claim (plus a USDG approval if the claim is not sponsored).
3. The identity NFT mints to your wallet and the name resolves immediately.
4. Optionally add Bitcoin, Solana and profile records at
   [rwa-id.com/names](https://rwa-id.com/names).

### What a platform controls

All of these are signed by the project owner; none needs the protocol.

| Function | Effect |
|---|---|
| `updateMerkleRoot` | Publish or replace the allowlist |
| `updateClaimFee` / `updateTreasury` | Change the fee and where your share goes |
| `fundSponsorship` / `withdrawSponsorship` | Fill or drain the project's sponsor pool |
| `claimFor` | Deliver a name to an allowlisted wallet (callable by anyone) |
| `setProjectTransferable` / `setTokenTransferable` | Soulbound or transferable, per project and per token |
| `setProjectImage` | Your own artwork on every name in the namespace |
| `pauseProject` / `unpauseProject` | Stop and resume new claims; issued names are untouched |
| `revokeIdentity` | Burn a name, clear its resolution, retire the label for good |
| `transferProjectOwnership` | Hand the namespace to another wallet or Safe |

---

## 💸 Fees and sponsorship

Every claim pays a fee in **USDG**, split on-chain at the moment of the claim and
transferred directly — the registry never escrows fees.

```
fee = max(project claimFee, minimumClaimFee)      // minimumClaimFee = 0.50 USDG
platform treasury ← 70%      protocol Safe ← 30%
```

| Project fee | Client pays | Platform (70%) | Protocol (30%) |
|---|---|---|---|
| 0 or anything below 0.50 | 0.50 USDG | 0.35 | 0.15 |
| 1.00 USDG | 1.00 | 0.70 | 0.30 |
| 5.00 USDG | 5.00 | 3.50 | 1.50 |

`effectiveClaimFee(projectId)` returns what a claim costs right now. The floor is new
in v4: v3 charged any non-zero fee as set, so a fee of one unit paid the protocol
nothing.

### Sponsor pools

- `fundSponsorship(projectId, amount)` moves USDG into the project's pool. **Anyone**
  can fund any project; **only the project owner** can `withdrawSponsorship`.
- When the pool holds at least one full fee, **the pool pays and the claimer pays
  nothing**. A partly funded pool is left alone rather than split across two payers.
- The 70/30 split still runs, so the platform's 70% returns to its own treasury: a
  sponsored claim costs the platform only the protocol's 30% (0.15 USDG at the floor).
- Sponsor pools are walled off: the Safe's `rescueToken` can only move USDG **above**
  `totalSponsorBalance`.

### `claimFor`

The Merkle leaf already binds each name to its wallet, so any caller can submit
`claimFor(projectId, wallet, label, proof)` and the identity still mints to that
wallet. Combined with a sponsor pool, a platform can issue names to its whole
allowlist and pay the gas itself; clients never sign anything.

| Failure | Meaning |
|---|---|
| `Invalid proof` | Name or wallet does not match the published root |
| `Already claimed` | That wallet already holds a name in this project (one per project) |
| `Name revoked` | The label was retired by the platform |
| `Project paused` | Claiming is switched off |

---

## 🧭 Names, records and resolution

### Naming rules (ENSIP-15)

| | Rule |
|---|---|
| **Slug** | 3–32 chars: `a–z`, `0–9`, interior hyphens; no `--` in positions 3–4. Uppercase is folded. Permanent once created |
| **Label** | 1–63 chars: lowercase `a–z`, `0–9`, hyphens; underscores only as a leading run; no `--` in positions 3–4 |

Labels are hashed exactly as given and never normalised, because the Merkle leaf is
built from the raw string off-chain. Anything a wallet's ENS normaliser would change
or reject is therefore **rejected** at claim time, so the allowlist, the mint and ENS
resolution agree by construction. (v2 minted `Zac` at `keccak("Zac")` while ENS
looked up `keccak("zac")`; v3 accepted `a_b` and `ab--cd`, which mint but never
resolve. v4's test suite checks labels against viem's ENS normaliser on 1,000 random
inputs.)

### How a name resolves

1. **ENS finds the resolver.** `rwa-id.eth` points at `RwaIdOffchainResolver` on
   Ethereum, which answers for every name beneath it (ENSIP-10).
2. **The resolver defers off-chain.** It reverts with `OffchainLookup` (EIP-3668) to
   `https://gateway.rwa-id.com/{sender}/{data}.json`.
3. **The gateway reads Robinhood Chain and signs.** It checks RWAIDv4.1 first, and
   the legacy v3 registry on Ethereum only when v4.1 has no project for the slug — so
   a slug created on v3 later can never shadow a v4 namespace. Any RPC failure is an
   error and nothing is signed.
4. **Ethereum verifies.** `resolveWithProof` accepts the answer only if it was signed
   by a trusted signer over:

```
keccak256(0x1900 ‖ resolver ‖ expires ‖ keccak256(request) ‖ keccak256(result))
```

A signature is valid only for this resolver, this exact question, this exact answer,
and until it expires — and expiry is capped on-chain at **1 hour**
(`MAX_VALIDITY`). The retired V2 resolver signed a gateway-supplied hash that was not
bound to the question or the answer, which is why it was replaced.

```
rootNode    = namehash("rwa-id.eth")
projectNode = keccak256(rootNode ‖ keccak256(slug))
nameNode    = keccak256(projectNode ‖ keccak256(label))
```

### What a name resolves to

| Record | Source |
|---|---|
| **ETH address** (coin 60) | Always the wallet holding the name, from `resolveAddr(node)`. Nobody — not even the holder — can point it elsewhere |
| **Other EVM chains** (ENSIP-11) | The holder's record for that chain, else their default-EVM record (`0x80000000`), else the holding wallet |
| **Bitcoin, Solana, others** (ENSIP-9) | Whatever the holder set in RWAIDRecords |
| **Text records** (ENSIP-5) | `url`, `email`, `com.twitter`, `description` and any other key the holder sets |

**RWAIDRecords** keys every record by `(node, holder)`. A record belongs to the
wallet that wrote it, so when a transferable name changes hands or a name is revoked,
the previous holder's records stop resolving immediately, and the new holder starts
from empty. It has no owner, no upgrade path and no fees. Limits: 128-byte addresses,
64-byte keys, 1,024-byte text values.

Because `resolveAddr` returns the **current token holder**, a transferable name that
changes hands resolves to its new owner with no further transaction.

> **ENSv2:** names under `rwa-id.eth` are answered by its wildcard resolver, not
> registered individually in ENS, so they need no migration.

### Reading identities from your own systems

```js
// Resolve the ordinary ENS way (viem follows the OffchainLookup itself)
const wallet = await client.getEnsAddress({ name: 'joe.acme.rwa-id.eth' })
```

```
// Registry reads on Robinhood Chain — no API key, no webhook, no vendor in the path
projectIdBySlugHash(keccak256(slug))  → projectId
nameNodeFromHash(projectId, hash)     → node
resolveAddr(node)                     → holder (0 if unclaimed or revoked)
claimed(projectId, wallet)            → bool
revoked(projectId, nameHash)          → bool
fullName(tokenId)                     → "joe.acme.rwa-id.eth"
projectUsage(projectId)               → owner, totalClaimed, protocolFees
```

---

## 🖼️ Identity NFTs and artwork

Every name is an ERC-721 token whose metadata the registry renders **on-chain** —
no metadata server, no IPFS dependency:

```
name        joe.acme.rwa-id.eth
image       the RWA ID identity card, drawn on-chain as SVG (v4.1 relaunch design)
attributes  Namespace · Label · Project ID · Transferability · Claimed (date)
```

- **Platform artwork.** `setProjectImage(projectId, uri)` replaces the image for the
  whole namespace with an `ipfs://`, `https://` or `ar://` link (max 512 chars,
  validated so it cannot inject into the JSON). Clearing it restores the on-chain card.
- **Marketplace refresh.** Image changes emit ERC-4906 `BatchMetadataUpdate`.
- **Soulbound** (transfers revert) or **transferable**, per project and per token.
- `contractURI()` supplies collection metadata; the Safe's `setBaseURI` /
  `setContractURI` remain as escape hatches.

---

## 🏷️ Reserved namespaces

**36 slugs** are reserved on v4.1 until **12 October 2029**, held at
`0x0000000000000000000000000000000000000001` — an address nobody controls — so they
cannot be squatted. Each also has a [platform token bucket](#platform-buckets-20).

| Group | Slugs |
|---|---|
| Institutional / securities | `securitize` `ondo` `superstate` `backed` `archax` |
| Credit / lending | `centrifuge` `maple` `goldfinch` `credix` `clearpool` |
| Real estate | `realt` `lofty` `propy` `homebase` `tangible` |
| Infrastructure / compliance | `polymesh` `tokeny` `realio` `defactor` `fasset` |
| Commodities / funds | `openeden` `swarm` `bitbond` `finblox` `parcl` |
| Robinhood | `robinhood` `robinhoodchain` `robinhood-chain` `hood` |
| Robinhood Chain infrastructure | `paxos` `bitgo` `morpho` |
| Robinhood Chain markets | `arcus` `lighter` `rialto` `meridian` |

The list lives in
[`protocol/config/reserved-namespaces.js`](protocol/config/reserved-namespaces.js), the
single source for the deploy script, the token buckets and the website
(`scripts/export-reserved.js` writes the site's copy; a test fails if they drift).

> These namespaces are held to protect the companies named from impersonation. A
> reservation does not mean the company is affiliated with, endorses, or has
> partnered with RWA ID. Company names and logos are trademarks of their respective
> owners.

**If one is yours,** email [partner@rwa-id.com](mailto:partner@rwa-id.com). Once the
company is verified, the Safe calls `reserveNamespace(slug, yourWallet, duration)` so
only you can create the project. **Every other slug is open** and can be registered
permissionlessly. Reservations expire: after 12 October 2029, `createProject` clears
a lapsed reservation and lets the next caller through.

---

## 🪙 The RWAIDRH token

**RWA IDENTITY (RWAIDRH)** —
[`0xdd0A628926C0C944A603eD93bca325161cD4efc6`](https://robinhoodchain.blockscout.com/token/0xdd0A628926C0C944A603eD93bca325161cD4efc6)
on Robinhood Chain. ERC-20 with ERC-20 Permit and burn; 18 decimals.

- **Supply:** 50,000,000,000, minted once. **No owner and no mint function.**
- **Launched** 14 October 2026 in a single transaction
  ([`0x0647cb61…9107`](https://robinhoodchain.blockscout.com/tx/0x0647cb6178c83811c21f14cf0dd990e877b50e3bc70b48cb69c04358f7279107),
  block 88065614) by `RWAIDLauncher`. Everything happens in its constructor, so
  nobody could act between the token existing and its liquidity being in place: no
  one could create or price the pool first. The launcher holds nothing afterwards.
- **Not required for anything.** Registering, claiming and resolving names never
  touch RWAIDRH; fees are paid in USDG. Holding RWAIDRH is not a share in the company
  and carries no claim on its revenue.

### Allocation

| Share | Amount | Held by | Terms |
|---|---|---|---|
| **40%** | 20B | Uniswap v3 pool, position #1442175 in `RWAIDLiquidityLock` | Launch liquidity. **Locked permanently** |
| **20%** | 10B | `RWAIDPlatformUnlock` | 36 platform buckets, earned by usage |
| **15%** | 7.5B | Protocol Safe | Treasury |
| **15%** | 7.5B | Protocol Safe | Open-platform pool, for platforms outside the reserved list |
| **10%** | 5B | Founder `VestingWallet` → vault.ensgiant.eth | Nothing before 14 Oct 2027, then linear to 13 Oct 2030 |

### Launch liquidity (40%)

The pool opened single-sided: the position holds only RWAIDRH, priced from the
opening price upward, so buyers move the price into it. The position NFT was minted
straight into **RWAIDLiquidityLock**, which:

- has **no function** that withdraws a position, decreases liquidity or transfers the NFT;
- has **no owner** who could add one;
- exposes `collect(tokenId)`, callable by anyone, which always sends accrued trading
  fees to the protocol Safe.

The fork test asserts that the lock's only state-changing functions are `collect` and
`onERC721Received`, and that `decreaseLiquidity` on the position reverts.

### Platform buckets (20%)

`RWAIDPlatformUnlock` holds one bucket per reserved namespace (≈277.8M RWAIDRH each).
A bucket always pays the namespace's **current project owner** on the registry.

1. **Activate** — Safe-only, once the real company is verified and has created the
   project. Manual on purpose: a lapsed reservation could otherwise let anyone
   register the slug and collect.
2. **Release** — anyone can call `release(slug)`. What is releasable is the
   *smaller* of two curves:

```
earned  = amount × min(claims since activation, 10,000) / 10,000
timeCap = amount × min(time since activation, 730 days) / 730 days
```

Usage decides whether a platform gets its tokens at all; time limits how fast. Every
v4 claim pays at least the 0.50 USDG floor, so manufactured usage has a real cost, and
the time cap bounds what it could extract per month.

3. **Exits** (Safe-only, visible on-chain): `cancel` returns only the *unearned*
   remainder of an activated bucket — what the platform earned stays theirs;
   `sweep` returns a bucket nobody activated by **14 April 2028**.

### Founder vesting (10%)

An unmodified OpenZeppelin `VestingWallet`: start **14 October 2027** (a 12-month
cliff from launch), duration 1,095 days, fully vested **13 October 2030**.

### Links

[Swap on Uniswap](https://app.uniswap.org/swap?chain=robinhood&inputCurrency=NATIVE&outputCurrency=0xdd0A628926C0C944A603eD93bca325161cD4efc6) ·
[DexScreener](https://dexscreener.com/robinhood/0xe03f2d01ca196b80c1048c7fc0213322400d05d3) ·
[GeckoTerminal](https://www.geckoterminal.com/robinhood/pools/0xe03f2d01Ca196B80C1048c7FC0213322400D05D3) ·
[Blockscout](https://robinhoodchain.blockscout.com/token/0xdd0A628926C0C944A603eD93bca325161cD4efc6) ·
[Token list](https://rwa-id.com/tokenlist.json) ·
[Logo](https://rwa-id.com/token/rwaidrh-512.png) ·
[rwa-id.com/#token](https://rwa-id.com/#token)

> Nothing in this repository is investment advice or an offer to sell. Always check
> the contract address before you trade.

---

## 🔐 Governance

The protocol is controlled by a **2-of-3 Safe** at
`0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab`, deployed at the same address on
Robinhood Chain and Ethereum. The v4.1 registry, the offchain resolver and
RWAIDPlatformUnlock use **Ownable2Step**, so the Safe had to accept each one
explicitly. A mistyped address can never strand them.

| Safe owns | Chain |
|---|---|
| RWAIDv4.1 registry (`owner`) and the protocol fee treasury | Robinhood Chain |
| RWAIDPlatformUnlock (`owner`) | Robinhood Chain |
| 15B RWAIDRH (treasury + open-platform pool) and the LP trading fees | Robinhood Chain |
| RwaIdOffchainResolver (`owner`) | Ethereum |
| RWAIDv3 (legacy registry) | Ethereum |

Owned by **nobody**: the RWAIDRH token, RWAIDLiquidityLock, RWAIDRecords and the
launcher. The founder VestingWallet belongs to its beneficiary.

### What the Safe can do

| Contract | Function | Effect |
|---|---|---|
| Registry | `reserveNamespace` / `batchReserveNamespaces` / `releaseNamespace` | Reserve a slug for a wallet, or release it |
| Registry | `setMinimumClaimFee` | Change the protocol-wide fee floor (0.50 USDG) |
| Registry | `setProtocolFeePercent` | Change the protocol split (30%), bounded **10–50%** by the contract |
| Registry | `setProtocolTreasury` | Redirect the protocol's share |
| Registry | `setBaseURI` / `setContractURI` | Repoint artwork away from the on-chain renderer |
| Registry | `rescueToken` | Recover tokens sent by mistake — never sponsor-pool funds |
| Resolver | `setSigner` / `setUrls` | Rotate the gateway signing key, or move the gateway URL |
| PlatformUnlock | `activate` / `cancel` / `sweep` / `addBuckets` | Run the platform buckets as described above |

### What the Safe cannot do

- Mint, transfer or revoke any client's name.
- Change a project's allowlist, fee, treasury, artwork or transferability.
- Touch a platform's treasury or sponsor pool.
- Point a name's ETH address anywhere but its holder.
- Withdraw the locked liquidity, mint RWAIDRH, or take back a bucket's earned tokens.

The floor is the one protocol setting that affects every project: raising
`setMinimumClaimFee` raises what a claim costs wherever the project fee is below it.

### Before approving a Safe transaction

The Safe UI may show calls to freshly verified contracts as raw hex. Confirm the
target address, that `value` is 0, and that the operation is `CALL`, never
`DELEGATECALL`.

### Audit status

The contracts are verified on Blockscout and Etherscan and covered by the test suite
below, including fuzzing labels against the ENS normaliser and a launch rehearsal on
a fork of live Robinhood Chain. **No third-party audit has been published yet.**

---

## 🏗️ Architecture

```
 Wallet ── resolve joe.acme.rwa-id.eth ──▶ ENS registry (Ethereum)
                                              │ resolver of rwa-id.eth
                                              ▼
                                  RwaIdOffchainResolver (Ethereum)
                                              │ revert OffchainLookup (EIP-3668)
                                              ▼
                              gateway.rwa-id.com  (Cloudflare Worker)
                         ┌────────────────────┴────────────────────┐
                         ▼                                         ▼
          RWAIDv4.1 + RWAIDRecords                     RWAIDv3 (legacy, Ethereum)
          (Robinhood Chain) — read first               only if v4.1 has no such slug
                         └────────────────────┬────────────────────┘
                                              │ signed (result, expires, sig)
                                              ▼
                       resolveWithProof (Ethereum): checks signer, binding, expiry
                                              │
                                              ▼
                                       address / record
```

Gateway endpoints:

| Path | |
|---|---|
| `GET /{sender}/{data}.json`, `POST /` | EIP-3668 lookups |
| `GET /resolve?name=joe.acme.rwa-id.eth` | Debug: what would be signed, and from which registry |
| `GET /health` | Signers, registries, resolver, records and RPC status |

---

## 🛠️ Developer setup

```bash
git clone https://github.com/RWA-ID/RWA-ID.git
cd RWA-ID/protocol
npm install
cp .env.example .env   # fill in your keys
```

Each top-level folder (`protocol/`, `apps/dashboard/`, `gateway/`) has its own
`package.json` and installs separately.

### Tests

```bash
npx hardhat test                    # 219 passing, 7 pending (the fork suites)
FORK_ROBINHOOD=1 npx hardhat test test/RWAIDLauncher.fork.test.js   # token launch on a fork
FORK_ROBINHOOD=1 npx hardhat run scripts/fork-check-v4.js           # v4 launch rehearsal
```

| Suite | Covers |
|---|---|
| `RWAIDv2.test.js` | Registry logic later versions inherit — projects, reservations, allowlists, fee split, soulbound, revocation, ownership |
| `RWAIDv3.test.js` | On-chain metadata, label rules, `contractURI`, `baseURI` escape hatch, ERC-4906 |
| `RWAIDv4.test.js` | Fee floor, sponsor pools, `claimFor`, platform artwork, ENS labels fuzzed against viem's normaliser, v3 event/ABI compatibility |
| `RWAIDv4.art.test.js` | The v4.1 on-chain identity card |
| `RWAIDRecords.test.js` | Holder-only writes, ETH = holder, records follow ownership |
| `RwaIdOffchainResolver.test.js` | Signature binding to resolver, request, result and expiry; the 1-hour cap |
| `RWAIDPlatformUnlock.test.js` | Funding, Safe-only activation, usage × time release, cancel / sweep, the fixed-supply token |
| `reservedNamespaces.test.js` | The 36 slugs are valid and the site's copy has not drifted |
| `RWAIDLauncher.fork.test.js` | The token launch against live Uniswap v3: split, price, permanent lock, a buy, a sell, fees to the Safe |

The gateway has unit tests (`cd gateway && npm test`) and two end-to-end scripts
against local forks (`scripts/e2e-fork.mjs`, `scripts/e2e-offchain.mjs`). Note that
Hardhat cannot fork Ethereum mainnet reliably; the gateway scripts use Foundry's
`anvil`.

### Deploy scripts

| Script | |
|---|---|
| `deploy-v4.js` | Deploy RWAIDv4 to Robinhood Chain, reserve the 36 slugs, hand ownership to the Safe |
| `deploy-records.js` | Deploy RWAIDRecords |
| `deploy-offchain-resolver.js` | Deploy RwaIdOffchainResolver on Ethereum |
| `launch-token.js` | Print the RWAIDRH launch plan; `LAUNCH=1` sends it |
| `export-reserved.js` | Write the reserved list the website renders |
| `render-art.js` | Render the on-chain artwork to PNGs to check by eye |
| `check-dashboard-abi.mjs` | Diff the console's hand-written ABI against the compiled contract |

Launch parameters live in `config/token-launch.js`, shared by the fork test and the
launch script so the two cannot drift.

### Website and console

```bash
cd apps/dashboard && npm install && npm run build
npx wrangler pages deploy dist --project-name rwa-id-dashboard --branch main
```

One Vite build serves both [rwa-id.com](https://rwa-id.com) (site, docs, claim,
names, console at `/console`) and [dashboard.rwa-id.com](https://dashboard.rwa-id.com)
(console at `/`). It reads Robinhood Chain straight from the browser — no backend, no
indexer. Cloudflare Pages is not git-connected: merging to `main` deploys nothing.

---

## 📦 Repository structure

```
protocol/                          Contracts, tests, deploy scripts (Hardhat)
  contracts/
    RWAIDv4.sol                    Registry on Robinhood Chain (deployed as v4.1)
    RWAIDRecords.sol               Per-holder address and text records
    RwaIdOffchainResolver.sol      Ethereum resolver for rwa-id.eth, signature-bound
    RWAIDToken.sol                 RWAIDRH: fixed supply, permit, burnable, no owner
    RWAIDLauncher.sol              One-transaction token launch
    RWAIDLiquidityLock.sol         Permanent Uniswap v3 LP lock; fees to the Safe
    RWAIDPlatformUnlock.sol        Platform buckets: earned by claims, released over time
    RWAIDv3.sol                    Legacy Ethereum registry
    RWAIDv2.sol                    Superseded registry
    RwaIdWildcardResolverV2.sol    Retired resolver
    RwaIdRegistry.sol, RwaIdWildcardResolver.sol   v1 (legacy)
  config/
    reserved-namespaces.js         The 36 reserved slugs (single source)
    token-launch.js                RWAIDRH launch parameters
  deployments/robinhood.json       Every live address
  scripts/                         See Deploy scripts
  test/                            See Tests
apps/
  dashboard/                       rwa-id.com + dashboard.rwa-id.com (Vite, Cloudflare Pages)
  site/                            Previous marketing site (retired October 2026)
gateway/                           CCIP-Read gateway, gateway.rwa-id.com (Cloudflare Worker)
whitepaper.md
```

---

## 🕰️ Version history

| Version | Chain | Date | What changed |
|---|---|---|---|
| v1 | Linea | Jan 2025 | Hash-only registry and wildcard resolver |
| v2 | Ethereum | Apr 2025 | Projects, Merkle allowlists, USDC fees, soulbound option. No `tokenURI` |
| v3 | Ethereum | 1 Aug 2026 | On-chain metadata, labels claimed as strings, lowercase enforced. 25 slugs reserved |
| v4.0 | Robinhood Chain | 13 Oct 2026 | Superseded the same day, never used |
| **v4.1** | Robinhood Chain | 13 Oct 2026 | USDG, real fee floor, sponsor pools, `claimFor`, ENSIP-15 labels, platform art, `projectUsage`, Ownable2Step, 36 reserved slugs |
| Records + resolver | RH Chain + Ethereum | 13 Oct 2026 | Multichain and text records; signature-bound resolver replaces V2 |
| RWAIDRH | Robinhood Chain | 14 Oct 2026 | Token launch, permanent LP lock, platform buckets, founder vesting |

The Merkle leaf has not changed since v2, so allowlists carry across versions.

---

## 🔒 Regulatory posture

| RWA ID **does** | RWA ID **does not** |
|---|---|
| ✅ Issue readable names for wallets | ❌ Collect personal data |
| ✅ Resolve them on-chain through ENS | ❌ Perform KYC or verification |
| ✅ Let platforms gate access on a public check | ❌ Assert identity claims |
| ✅ Split claim fees on-chain | ❌ Custody funds or assets |

---

## 📞 Contact

**Founder:** Hector Morel
**Partnerships:** [partner@rwa-id.com](mailto:partner@rwa-id.com)
**Website:** [rwa-id.com](https://rwa-id.com) · **X:** [@rwaidentity](https://x.com/rwaidentity)

RWA ID is operated by Only Buy Bitcoin LLC, a Delaware LLC doing business as RWA ID.

## 📄 License

MIT

## 🙏 Built with

[ENS](https://ens.domains/) ·
[EIP-3668 CCIP-Read](https://eips.ethereum.org/EIPS/eip-3668) ·
[OpenZeppelin Contracts v5](https://github.com/OpenZeppelin/openzeppelin-contracts) ·
[Uniswap v3](https://uniswap.org/) ·
[Robinhood Chain](https://robinhood.com/) ·
[Cloudflare Workers](https://workers.cloudflare.com/)
