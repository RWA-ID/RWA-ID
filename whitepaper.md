# RWA ID: Readable Names for the Client Wallets of Tokenized-Asset Platforms

**Version 4.1**
**October 2026**

---

## Abstract

Tokenized real-world assets are held in wallets, and wallets are identified by
40-character hexadecimal strings. Every platform that issues tokenized funds,
credit, real estate or commodities ends up building its own way to tell its
clients' wallets apart, and none of those systems is visible to the wallets,
explorers and exchanges the clients actually use.

RWA ID gives each platform a namespace under `rwa-id.eth` and lets it issue its
clients names such as `joe.acme.rwa-id.eth`. Every name is a real ENS name, backed
by an ERC-721 token, that resolves to the wallet holding it in any application
that reads `.eth`, with no SDK and no integration work. A platform publishes only
a Merkle root on-chain; clients claim their names with a proof; the protocol
never sees personal data, performs no identity verification and holds no client
assets.

This document describes **RWA ID v4.1**, live on **Robinhood Chain** (chain id
4663) since 13 October 2026, its Ethereum-side resolver, the RWAIDRecords
contract for multichain and text records, and the **RWAIDRH** token launched on
14 October 2026. Every contract named here is deployed, verified and listed in
[Section 12](#12-deployed-contracts).

---

## What changed in v4

v3 (August 2026) put identity metadata and artwork on-chain on Ethereum. v4 moves
the registry to Robinhood Chain and changes what a platform can do with it.

| | v3 (Ethereum) | v4.1 (Robinhood Chain) |
|---|---|---|
| Registry | `0x6413…A2C7` | [`0x85B0…8132`](https://robinhoodchain.blockscout.com/address/0x85B09167aB330641f8e5F73E2e904C75FDFa8132) |
| Claim fee | USDC; any non-zero fee accepted, so a one-unit fee paid the protocol nothing | **USDG**, with an enforced **0.50 USDG floor** |
| Who pays | The client, always | The client, or the platform through a **sponsor pool** |
| Who submits | The client, always | Anyone, through **`claimFor`**; the name still mints only to the allowlisted wallet |
| Label rules | Lowercase `a-z 0-9 - _` | **ENSIP-15-compatible**: anything a wallet's normaliser would change is rejected |
| Artwork | On-chain card only | On-chain card, or **one image per namespace** chosen by the platform |
| Records | ETH address only | **RWAIDRecords**: Bitcoin, Solana, other EVM chains and text records |
| Resolver | V2: signatures not bound to the question or answer | **RwaIdOffchainResolver**: every answer bound to resolver, request, result and a ≤ 1 hour expiry |
| Ownership | `Ownable` | `Ownable2Step`, owned by a 2-of-3 Safe |
| Reserved slugs | 25 | 36, until 12 October 2029 |
| Gas per claim | Ethereum L1 | A fraction of a cent |

What did not change: the ENS name layout, node derivation and the Merkle leaf
format. An allowlist built for v2 or v3 is valid on v4.1 as-is, and every name
issued under v3 keeps resolving.

---

## Contents

1. [Introduction](#1-introduction)
2. [How RWA ID works](#2-how-rwa-id-works)
3. [Architecture](#3-architecture)
4. [The registry](#4-the-registry)
5. [Resolution](#5-resolution)
6. [Fees and sponsorship](#6-fees-and-sponsorship)
7. [The RWAIDRH token](#7-the-rwaidrh-token)
8. [Governance](#8-governance)
9. [Security model](#9-security-model)
10. [Privacy and regulatory posture](#10-privacy-and-regulatory-posture)
11. [Integration](#11-integration)
12. [Deployed contracts](#12-deployed-contracts)
13. [Roadmap](#13-roadmap)
14. [Version history](#14-version-history)
15. [References](#15-references)

[Appendix A: Glossary](#appendix-a-glossary) ·
[Appendix B: Interfaces](#appendix-b-interfaces) ·
[Disclaimer](#disclaimer)

---

## 1. Introduction

### 1.1 The problem

A tokenized asset settles to a wallet address such as
`0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`. That address is all the client sees
in their wallet, all a counterparty sees on an explorer, and all an exchange sees
on a deposit. In practice this creates four problems:

- **Error-prone transfers.** Addresses are checked by eye, a few characters at
  either end. Address-poisoning attacks exploit exactly that habit.
- **Siloed identity.** Each platform maps addresses to clients in its own
  database. The mapping is invisible outside the platform and identical work is
  repeated by every issuer.
- **Cost.** Registering a separate ENS name per client on Ethereum costs several
  dollars a year per name plus gas, and leaves the client to manage renewals.
- **Wrong tools.** Decentralized identifiers and verifiable credentials address a
  different question — *who is this person* — and are poorly supported in
  wallets. A soulbound badge says nothing in the place a client types an address.

### 1.2 What RWA ID is

RWA ID is a **naming** layer, not an identity-verification layer. It answers one
question — *which wallet is `joe.acme.rwa-id.eth`?* — the standard ENS way, so the
answer appears everywhere ENS already works. Whether Joe is a verified person, an
accredited investor or a resident of any jurisdiction remains the platform's
business, decided and recorded by the platform.

### 1.3 Design principles

1. **Non-custodial.** No custody of client assets or keys. Claim fees are split and
   paid out in the same transaction; the registry never escrows them.
2. **No personal data.** The protocol stores a Merkle root, labels the platform
   chose, and wallet addresses that are public anyway.
3. **No integration required.** If an application can resolve `.eth`, it can
   resolve an RWA ID name.
4. **Platforms in control of their namespace.** Allowlists, fees, artwork,
   transferability, pausing and revocation are the platform's, and the protocol
   cannot override them (see [8.3](#83-what-the-safe-cannot-do)).
5. **Explicit trust.** The one off-chain component — the resolution gateway — is
   constrained on-chain, and every assumption it adds is listed in
   [Section 9](#9-security-model).

---

## 2. How RWA ID works

### 2.1 Name format

```
<label>.<slug>.rwa-id.eth

joe.acme.rwa-id.eth          a client wallet
treasury.acme.rwa-id.eth     the platform's own treasury
ana.acme.rwa-id.eth
```

- The **slug** is the platform's namespace, created once and permanent.
- The **label** is one client's name within it, chosen by the platform.

RWA ID names **wallets**, not assets. A name refers to whoever holds its token.

### 2.2 Roles

| Role | Does | Signs with |
|---|---|---|
| **Platform** | Creates a namespace, publishes allowlists, sets fees and artwork, revokes names | The project-owner wallet (a Safe is recommended) |
| **Client** | Claims a name for the allowlisted wallet; optionally sets extra records | Their own wallet — or nothing, if the platform delivers with `claimFor` |
| **Sponsor** | Funds a project's sponsor pool so its clients claim free | Any wallet |
| **Protocol** | Sets protocol-wide parameters within on-chain bounds; runs the gateway | The 2-of-3 protocol Safe; the gateway signer key |
| **Anyone** | Resolves names, reads the registry, releases earned token buckets | — |

### 2.3 Lifecycle

```
Platform                              Robinhood Chain                    Client
────────                              ───────────────                    ──────
createProject("acme", …)      ──▶     project #n, acme.rwa-id.eth
upload name,wallet CSV
  build Merkle tree locally
  pin the proof set to IPFS
updateMerkleRoot(n, root)     ──▶     root stored
share claim link              ───────────────────────────────────▶     open link
                                                                        approve USDG (if unsponsored)
                                      claim(n, label, proof)   ◀──     confirm
                                      ERC-721 minted to wallet
                                      fee split 70/30, paid out
                                                                        joe.acme.rwa-id.eth resolves
```

Or, with a funded sponsor pool, the platform calls
`claimFor(n, wallet, label, proof)` for each client and the clients sign nothing.

---

## 3. Architecture

### 3.1 Two chains, one name

RWA ID splits the system across two chains on purpose:

- **Robinhood Chain** holds state that changes often and must be cheap to write:
  projects, allowlist roots, identity tokens, fees and per-name records.
- **Ethereum** holds the one thing ENS clients look up: the resolver of
  `rwa-id.eth`. It changes rarely and is read by every wallet.

A **CCIP-Read gateway** (EIP-3668) connects them. Wallets resolve names on
Ethereum as usual; the resolver asks them to fetch a signed answer from the
gateway, and verifies the signature on Ethereum before returning it.

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

### 3.2 Components

| Component | Chain | Responsibility |
|---|---|---|
| **RWAIDv4.1** | Robinhood Chain | Namespaces, allowlist roots, claims, identity NFTs, fees, sponsor pools, reservations |
| **RWAIDRecords** | Robinhood Chain | Per-holder addresses on other chains and text records. No owner |
| **RwaIdOffchainResolver** | Ethereum | `rwa-id.eth`'s resolver. ENSIP-10 wildcard; verifies gateway signatures |
| **Gateway** | Off-chain (Cloudflare Worker) | Reads the registries, builds the answer, signs it |
| **Console and site** | Off-chain (static, Cloudflare Pages) | rwa-id.com, the claim page, the holder page and the platform console. Reads the chain directly from the browser; no backend, no indexer |
| **RWAIDRH and launch contracts** | Robinhood Chain | Token, permanent liquidity lock, platform buckets, founder vesting ([Section 7](#7-the-rwaidrh-token)) |

### 3.3 Why Robinhood Chain

- **Cost.** A claim on Ethereum L1 cost dollars in gas; on Robinhood Chain it
  costs a fraction of a cent. That makes sponsored, platform-delivered issuance to
  thousands of clients practical.
- **Audience.** Robinhood Chain is built for tokenized assets, and the platforms
  issuing on it are RWA ID's intended users.
- **USDG.** Paxos's USDG is native to the chain, giving fees a regulated
  dollar-denominated settlement asset.
- **Ethereum resolution is unaffected.** Because names resolve through ENS on
  Ethereum, moving the registry did not change how any wallet looks them up.

---

## 4. The registry

### 4.1 Projects

`createProject(slug, treasury, claimFee, transferable)` registers
`<slug>.rwa-id.eth`. It is permissionless and free (gas only). The caller becomes
the **project owner**; ownership can later be handed over with
`transferProjectOwnership`. Each project has:

| Field | Meaning |
|---|---|
| `owner` | The wallet that controls the project |
| `treasury` | Where the platform's 70% of each claim fee goes |
| `claimFee` | The platform's chosen fee in USDG (6 decimals); the floor applies if lower |
| `merkleRoot` | The current allowlist |
| `transferable` | Whether names in the project can move between wallets |
| `paused` | Whether new claims are accepted |
| `image` | Optional artwork URI for every name in the project |

### 4.2 Allowlists

A platform's client list never reaches an RWA ID server or the chain. The console
builds the Merkle tree in the platform's browser, pins the **proof set** to IPFS,
and writes only the 32-byte root on-chain with `updateMerkleRoot`.

```
leaf = keccak256(abi.encodePacked(wallet, keccak256(bytes(label))))
```

The leaf binds a label to one wallet. It has not changed since v2, so allowlists
carry across versions. The tree hashes each pair in sorted order, as OpenZeppelin's
`MerkleProof` expects.

- **Updating.** Publishing a new root replaces the old one. Names already claimed
  are unaffected. To add clients, the console loads the live proof set, appends
  and republishes.
- **Stale links.** The claim page checks that the proof set it was given matches
  the live root, so an outdated link fails with an explanation rather than a
  reverted transaction.
- **Publicity.** The pinned proof set is public and permanent: it lists every
  label and wallet on the allowlist. Platforms should use pseudonymous labels, not
  clients' legal names, unless they have a lawful basis to publish them.

### 4.3 Claiming

`claim(projectId, label, proof)` mints the name to `msg.sender` if the proof
verifies. `claimFor(projectId, wallet, label, proof)` does the same for `wallet`
and may be called by anyone: the leaf already fixes which wallet a label belongs
to, so a third party can only deliver a name to its rightful wallet.

A claim reverts if:

| Revert | Meaning |
|---|---|
| `Invalid proof` | The label and wallet are not in the published root |
| `Already claimed` | That wallet already holds a name in this project — one per wallet per project |
| `Node already claimed` | Another wallet already holds this label |
| `Name revoked` | The platform retired this label |
| `Project not active` | The platform has paused claiming |
| `Project not found` | No project with that id |
| `Label: …` | The label breaks the naming rules below |

On success the registry mints the ERC-721, records the name's node, collects the
fee ([Section 6](#6-fees-and-sponsorship)) and emits events compatible with v3's,
so v3 indexers keep working.

### 4.4 Naming rules

| | Rule |
|---|---|
| **Slug** | 3–32 characters: `a–z`, `0–9`, interior hyphens; no `--` in positions 3–4. Uppercase is folded. Permanent once created |
| **Label** | 1–63 characters: lowercase `a–z`, `0–9`, hyphens; underscores only as a leading run; no `--` in positions 3–4 |

Labels are hashed exactly as given, because the Merkle leaf is built from the raw
string off-chain. Anything an ENS normaliser (ENSIP-15) would change or reject is
therefore rejected at claim time, so the allowlist, the token and ENS resolution
agree by construction.

This closes two classes of bug seen in earlier versions. v2 minted `Zac` at
`keccak("Zac")` while ENS looked up `keccak("zac")`, so the name never resolved.
v3 accepted `a_b` and `ab--cd`, which minted but are rejected by ENS normalisers.
The v4 test suite fuzzes 1,000 random labels against viem's ENS normaliser and
requires the contract and the normaliser to agree on every one.

### 4.5 Node derivation

```
rootNode    = namehash("rwa-id.eth")
projectNode = keccak256(rootNode ‖ keccak256(slug))
nameNode    = keccak256(projectNode ‖ keccak256(label))
```

These are the standard ENS namehash steps, so the node the registry stores is the
node ENS clients ask about.

### 4.6 Identity NFTs

Every name is an ERC-721 token whose `tokenURI` is rendered **on-chain** — no
metadata server and no IPFS dependency:

```
name        joe.acme.rwa-id.eth
image       the RWA ID identity card, drawn on-chain as SVG
attributes  Namespace · Label · Project ID · Transferability · Claimed (date)
```

- **Platform artwork.** `setProjectImage(projectId, uri)` replaces the image for
  every name in the project with an `ipfs://`, `https://` or `ar://` URI (at most
  512 characters, character-checked so it cannot break out of the JSON). Clearing
  it restores the on-chain card.
- **Marketplace refresh.** Artwork changes emit ERC-4906 `BatchMetadataUpdate`.
- **Collection metadata** comes from `contractURI()`. The Safe's `setBaseURI` and
  `setContractURI` remain as escape hatches if the on-chain renderer ever needs
  replacing.

### 4.7 Transferability and revocation

- **Soulbound or transferable**, set per project (`setProjectTransferable`) and
  overridable per token (`setTokenTransferable`). A soulbound name's transfers
  revert. A transferable name resolves to its new holder immediately, with no
  further transaction, because resolution reads the current token owner.
- **Revocation.** `revokeIdentity` burns the token, clears its resolution and
  retires the label in that project permanently. It is the platform's tool for an
  account that closes or a wallet that is compromised.
- **Pausing.** `pauseProject` stops new claims; issued names are untouched and keep
  resolving.

### 4.8 Reserved namespaces

36 slugs are reserved until **12 October 2029** to protect well-known RWA
companies from impersonation. They are held for
`0x0000000000000000000000000000000000000001`, an address nobody controls.

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

A reservation does not mean the company is affiliated with, endorses, or has
partnered with RWA ID; company names are trademarks of their owners. When a
company proves control, the Safe calls `reserveNamespace(slug, wallet, duration)`
so only that wallet can create the project. Every other slug is open. After the
expiry, `createProject` clears a lapsed reservation and lets the next caller
through.

---

## 5. Resolution

### 5.1 The lookup

1. **ENS finds the resolver.** A wallet asks the ENS registry on Ethereum for the
   resolver of `joe.acme.rwa-id.eth`. Neither `joe.acme` nor `acme` has one, so
   ENSIP-10 wildcard resolution falls back to `rwa-id.eth`'s:
   **RwaIdOffchainResolver**.
2. **The resolver defers.** It reverts with `OffchainLookup` (EIP-3668), naming
   `https://gateway.rwa-id.com/{sender}/{data}.json` and a callback.
3. **The gateway answers.** It decodes the request, reads **RWAIDv4.1 first**, and
   falls back to the legacy **v3 registry on Ethereum** only when v4.1 has no
   project for the slug — so a slug created on v3 can never shadow a v4 namespace.
   It signs the result. Any RPC failure is returned as an error; the gateway never
   signs a guess.
4. **Ethereum verifies.** The wallet calls `resolveWithProof` with the gateway's
   response. The resolver accepts it only if a trusted signer signed:

```
keccak256(0x1900 ‖ resolver ‖ expires ‖ keccak256(request) ‖ keccak256(result))
```

### 5.2 What the signature binds

| Bound to | Prevents |
|---|---|
| `resolver` (this contract's address) | Replaying an answer to a different resolver |
| `keccak256(request)` | Answering a different question — another name or another record — with a valid signature |
| `keccak256(result)` | Altering the answer after signing |
| `expires`, capped on-chain at **1 hour** (`MAX_VALIDITY`) | Replaying an old answer indefinitely after the name changes hands or is revoked |

The resolver this replaced (RwaIdWildcardResolverV2) verified a gateway-supplied
hash that was not bound to the request or the result. It was retired on 13
October 2026 for that reason.

### 5.3 What a name resolves to

| Record | Source |
|---|---|
| **ETH address** (coin type 60) | Always the wallet holding the token, via `resolveAddr(node)`. Nobody — not even the holder — can point it elsewhere |
| **Other EVM chains** (ENSIP-11) | The holder's record for that chain, else their default-EVM record (coin type `0x80000000`), else the holding wallet |
| **Bitcoin, Solana and others** (ENSIP-9) | Whatever the holder set in RWAIDRecords |
| **Text records** (ENSIP-5) | `url`, `email`, `com.twitter`, `description` or any other key the holder sets |
| **Unclaimed or revoked names** | Nothing: the gateway returns an empty answer |

Fixing the ETH address to the holder is deliberate. A platform issues a name *for
a wallet*; letting the name point anywhere else would let it say something the
platform never attested.

### 5.4 RWAIDRecords

RWAIDRecords stores records keyed by **(node, holder)**. A record belongs to the
wallet that wrote it:

- only the current token holder can write records for a name;
- when a transferable name changes hands, or a name is revoked, the previous
  holder's records stop resolving immediately and the new holder starts empty;
- the contract has no owner, no upgrade path and no fees.

Limits: 128-byte addresses, 64-byte keys, 1,024-byte text values. Holders manage
their records at [rwa-id.com/names](https://rwa-id.com/names), which encodes
addresses in the ENSIP-9 binary format for each chain.

### 5.5 Gateway endpoints

| Path | |
|---|---|
| `GET /{sender}/{data}.json`, `POST /` | EIP-3668 lookups |
| `GET /resolve?name=joe.acme.rwa-id.eth` | Debug: what would be signed, and from which registry |
| `GET /health` | Signer, registries, resolver, records and RPC status |

### 5.6 ENSv2

Names under `rwa-id.eth` are answered by its wildcard resolver rather than
registered individually in ENS, so the ENSv2 migration requires nothing per name.
`rwa-id.eth` itself is registered until 25 November 2031.

---

## 6. Fees and sponsorship

### 6.1 The claim fee

Every claim pays a fee in **USDG**, split on-chain and transferred out in the same
transaction:

```
fee = max(project claimFee, minimumClaimFee)       minimumClaimFee = 0.50 USDG
platform treasury ← 70%        protocol Safe ← 30%
```

| Project fee | Client pays | Platform (70%) | Protocol (30%) |
|---|---|---|---|
| 0, or anything below 0.50 | 0.50 USDG | 0.35 | 0.15 |
| 1.00 USDG | 1.00 | 0.70 | 0.30 |
| 5.00 USDG | 5.00 | 3.50 | 1.50 |

`effectiveClaimFee(projectId)` returns what a claim costs right now. An
unsponsored claim takes two confirmations in the client's wallet: a USDG approval,
then the claim.

**The floor is new in v4.** v3 charged any non-zero platform fee as set, so a fee
of one base unit paid the protocol nothing. v4 enforces the floor in the contract.

### 6.2 Sponsor pools

A platform that does not want its clients to pay — or to hold USDG at all — funds
a sponsor pool:

- `fundSponsorship(projectId, amount)` moves USDG into the project's pool. Anyone
  can fund any project.
- Only the project owner can `withdrawSponsorship`.
- When the pool holds **at least one full fee**, the pool pays and the claimer
  pays nothing. A partly funded pool is left alone rather than splitting one fee
  across two payers.
- The 70/30 split still runs, so the platform's 70% goes back to its own treasury.
  **A sponsored claim costs the platform only the protocol's 30%** — 0.15 USDG at
  the floor.
- Sponsor funds are walled off from the protocol: the Safe's `rescueToken` can
  move only USDG in excess of `totalSponsorBalance`.

With a funded pool and `claimFor`, a platform can issue names to an entire
allowlist and pay the gas itself. Its clients sign nothing and need no USDG.

### 6.3 Where the money goes

| Flow | Destination | When |
|---|---|---|
| Platform's 70% of claim fees | The project's `treasury` | At claim time |
| Protocol's 30% of claim fees | The protocol Safe | At claim time |
| Sponsor-pool balances | Held by the registry for that project | Until spent on claims or withdrawn by the owner |
| Uniswap v3 trading fees on the RWAIDRH pool | The protocol Safe | Whenever anyone calls `collect` on the liquidity lock |

The registry never holds fee revenue. Protocol revenue funds operations,
infrastructure and a third-party security audit.

---

## 7. The RWAIDRH token

### 7.1 Summary

**RWA IDENTITY (RWAIDRH)**,
[`0xdd0A628926C0C944A603eD93bca325161cD4efc6`](https://robinhoodchain.blockscout.com/token/0xdd0A628926C0C944A603eD93bca325161cD4efc6)
on Robinhood Chain. ERC-20 with ERC-2612 permit and burn, 18 decimals.

- **Supply:** 50,000,000,000, minted once at launch. **No owner and no mint
  function** — the supply can only fall, through holders burning their own tokens.
- **Not required to use RWA ID.** Creating namespaces, claiming names and
  resolving them never touch RWAIDRH; fees are paid in USDG.
- **Not equity.** Holding RWAIDRH is not a share in the operating company, carries
  no vote over the protocol and no claim on its revenue.

### 7.2 Allocation

| Share | Amount | Held by | Terms |
|---|---|---|---|
| **40%** | 20B | Uniswap v3 position #1442175 in `RWAIDLiquidityLock` | Launch liquidity. **Locked permanently** |
| **20%** | 10B | `RWAIDPlatformUnlock` | 36 buckets for the reserved namespaces, earned by usage |
| **15%** | 7.5B | Protocol Safe | Treasury |
| **15%** | 7.5B | Protocol Safe | Open-platform pool, for platforms outside the reserved list |
| **10%** | 5B | OpenZeppelin `VestingWallet` | Founder. Nothing before 14 October 2027, then linear to 13 October 2030 |

### 7.3 A one-transaction launch

The whole launch happened in the constructor of a single contract,
`RWAIDLauncher`, in one transaction on 14 October 2026
([`0x0647cb61…9107`](https://robinhoodchain.blockscout.com/tx/0x0647cb6178c83811c21f14cf0dd990e877b50e3bc70b48cb69c04358f7279107),
block 88065614). In that transaction it:

1. deployed the token and received the full supply;
2. deployed the founder `VestingWallet` and funded it;
3. deployed `RWAIDPlatformUnlock`, funded the 36 buckets and handed ownership to
   the Safe (`Ownable2Step`; the Safe has since accepted);
4. created the WETH/RWAIDRH Uniswap v3 pool at the 1% fee tier and initialised it
   at a **$100,000 fully diluted valuation**, priced from the on-chain WETH/USDG
   pool;
5. minted the 40% liquidity position directly into `RWAIDLiquidityLock`;
6. sent the remaining 30% to the Safe.

Because all of this happened inside one constructor, nobody could act between the
token existing and its liquidity being in place: no one could create the pool
first, pick its price, or buy before liquidity existed. The launcher retains
nothing and has no callable functions.

### 7.4 Permanent liquidity

The pool opened **single-sided**: the position holds only RWAIDRH, from the
opening price upward, so buyers move the price into it. The position NFT was
minted straight into **RWAIDLiquidityLock**, which:

- has **no function** that withdraws the position, decreases liquidity or
  transfers the NFT;
- has **no owner** who could add one;
- exposes `collect(tokenId)`, callable by anyone, which always sends accrued
  trading fees to the protocol Safe.

The fork test asserts that the lock's only state-changing functions are
`collect` and `onERC721Received`, and that `decreaseLiquidity` on the position
reverts.

### 7.5 Platform buckets

The 20% platform allocation exists so that the platforms RWA ID was built for
share in it **in proportion to how much they use it**. `RWAIDPlatformUnlock` holds
one bucket of ≈277.8M RWAIDRH for each reserved namespace. A bucket always pays
the namespace's **current project owner** on the registry.

1. **Activate (Safe only).** After the real company is verified and has created
   its project. This step is manual on purpose: otherwise, once a reservation
   lapsed, anyone could register the slug and collect the bucket.
2. **Release (anyone).** `release(slug)` pays out the smaller of two curves:

```
earned  = amount × min(claims since activation, 10,000) / 10,000
timeCap = amount × min(time since activation, 730 days) / 730 days
releasable = min(earned, timeCap) − already released
```

Usage decides *whether* a platform receives its tokens; time limits *how fast*.
Since every v4 claim pays at least the 0.50 USDG floor, manufacturing claims to
unlock a bucket has a real cost (at least 5,000 USDG for a full bucket), and the
time cap bounds what any such attempt could extract per month.

3. **Exits (Safe only, visible on-chain).** `cancel` returns only the *unearned*
   remainder of an activated bucket — what a platform has earned stays claimable
   by it. `sweep` returns a bucket that nobody activated by **14 April 2028**.

### 7.6 Founder vesting

An unmodified OpenZeppelin `VestingWallet`
([`0x0A04…f91d`](https://robinhoodchain.blockscout.com/address/0x0A048950f66C14b517DF6B02F04f8db2d9F9f91d)):
start 14 October 2027 (a 12-month cliff from launch), duration 1,095 days, fully
vested on 13 October 2030. Nothing can be released before the start.

---

## 8. Governance

### 8.1 The protocol Safe

The protocol is controlled by a **2-of-3 Safe** at
`0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab`, deployed at the same address on
Robinhood Chain and Ethereum. The registry, the offchain resolver and
RWAIDPlatformUnlock use `Ownable2Step`, so the Safe had to accept each explicitly;
a mistyped address can never strand them.

| The Safe owns | Chain |
|---|---|
| RWAIDv4.1 and the protocol fee treasury | Robinhood Chain |
| RWAIDPlatformUnlock | Robinhood Chain |
| 15B RWAIDRH (treasury and open-platform pool) and the LP trading fees | Robinhood Chain |
| RwaIdOffchainResolver | Ethereum |
| RWAIDv3 (legacy registry) | Ethereum |

Owned by **nobody**: the RWAIDRH token, RWAIDLiquidityLock, RWAIDRecords and
RWAIDLauncher. The founder VestingWallet belongs to its beneficiary.

### 8.2 What the Safe can do

| Contract | Function | Effect |
|---|---|---|
| Registry | `reserveNamespace`, `batchReserveNamespaces`, `releaseNamespace` | Reserve a slug for a wallet, or release it |
| Registry | `setMinimumClaimFee` | Change the protocol-wide floor (0.50 USDG) |
| Registry | `setProtocolFeePercent` | Change the protocol's share (30%), **bounded 10–50% by the contract** |
| Registry | `setProtocolTreasury` | Redirect the protocol's share |
| Registry | `setBaseURI`, `setContractURI` | Repoint artwork away from the on-chain renderer |
| Registry | `rescueToken` | Recover tokens sent by mistake — never sponsor-pool funds |
| Resolver | `setSigner`, `setUrls` | Rotate the gateway signing key, or move the gateway |
| PlatformUnlock | `activate`, `cancel`, `sweep`, `addBuckets` | Run the platform buckets ([7.5](#75-platform-buckets)) |

The floor is the one protocol setting that affects every project's price: raising
it raises the cost of a claim wherever a project's own fee is lower.

### 8.3 What the Safe cannot do

- Mint, transfer or revoke any client's name.
- Change a project's allowlist, fee, treasury, artwork or transferability.
- Touch a platform's treasury or sponsor pool.
- Point a name's ETH address anywhere but its holder.
- Withdraw the locked liquidity, mint RWAIDRH, or take back tokens a platform
  bucket has already earned.

### 8.4 Upgrades

None of the contracts is upgradeable. A new registry version is a new deployment:
platforms opt in by creating projects on it, and the gateway reads versions in a
fixed order ([5.1](#51-the-lookup)) so existing names keep resolving. This is how
v2 → v3 → v4 happened, and how any v5 would.

---

## 9. Security model

### 9.1 Trust assumptions

| Component | You trust | If it fails |
|---|---|---|
| **Registry contracts** | Their code, which is verified and public | Bugs would affect claims and fees. No third-party audit has been published yet ([9.4](#94-audit-status)) |
| **Robinhood Chain** | Its sequencer and RPC nodes to report current state | A wrong or stalled view could produce stale answers. Ownership itself is settled on-chain and is unaffected |
| **Gateway signer key** | That it is not compromised | An attacker could sign false answers for names, each valid for at most 1 hour. Response: the Safe rotates the key with `setSigner` |
| **Gateway availability** | That it is up | Names stop resolving until it returns. Tokens, ownership and records are unaffected |
| **ENS on Ethereum** | The ENS registry and `rwa-id.eth`'s resolver setting | Standard ENS assumptions |
| **The Safe signers** | Two of three to act honestly | Bounded by [8.3](#83-what-the-safe-cannot-do) |

The gateway is a constrained oracle, not a source of truth. Anyone can check any
answer it gives against the registry on Robinhood Chain, and its `/resolve`
endpoint shows exactly what it would sign.

### 9.2 Threats and mitigations

| Threat | Mitigation |
|---|---|
| Claiming someone else's name | The Merkle leaf binds label to wallet; `claimFor` can only deliver to that wallet |
| Squatting well-known namespaces | 36 reservations held by an unusable address until 2029 |
| Lookalike or unresolvable labels | ENSIP-15 rules enforced on-chain, fuzz-tested against a normaliser |
| Replayed or redirected gateway answers | Signature bound to resolver, request, result and a ≤ 1 hour expiry |
| Stale answers after a transfer or revocation | Expiry cap; records keyed by holder so old records stop resolving at once |
| A v3 slug shadowing a v4 namespace | The gateway reads v4.1 first and v3 only when v4.1 has no such slug |
| Fee bypass with a dust fee | Enforced 0.50 USDG floor |
| Protocol taking sponsor funds | `rescueToken` limited to the balance above `totalSponsorBalance` |
| Manufactured usage to unlock buckets | Each claim costs ≥ 0.50 USDG; release is capped by a 730-day time curve; activation is manual |
| Rug-pulling launch liquidity | Position held by a lock with no withdraw path and no owner |
| Front-running the token launch | Token, pool, price and liquidity created in one constructor |
| Artwork URI injection into token JSON | Scheme, length and character checks on `setProjectImage` |
| Safe approving the wrong call | Signers confirm target, `value = 0` and `CALL` (never `DELEGATECALL`) |

### 9.3 Testing

The protocol suite has **219 passing tests** plus fork suites run against live
Robinhood Chain state:

| Suite | Covers |
|---|---|
| `RWAIDv2.test.js` | Logic later versions inherit: projects, reservations, allowlists, fee split, soulbound, revocation, ownership |
| `RWAIDv3.test.js` | On-chain metadata, label rules, `contractURI`, `baseURI`, ERC-4906 |
| `RWAIDv4.test.js` | Fee floor, sponsor pools, `claimFor`, platform artwork, labels fuzzed against viem's normaliser, v3 event/ABI compatibility |
| `RWAIDv4.art.test.js` | The v4.1 on-chain identity card |
| `RWAIDRecords.test.js` | Holder-only writes, ETH = holder, records follow ownership |
| `RwaIdOffchainResolver.test.js` | Signature binding to resolver, request, result and expiry; the 1-hour cap |
| `RWAIDPlatformUnlock.test.js` | Funding, Safe-only activation, usage × time release, cancel and sweep |
| `reservedNamespaces.test.js` | The 36 slugs are valid and the website's copy has not drifted |
| `RWAIDLauncher.fork.test.js` | The launch against live Uniswap v3: split, price, permanent lock, a buy, a sell, fees to the Safe |

The gateway has its own unit tests and end-to-end scripts that resolve names
against local forks of both chains.

### 9.4 Audit status

Every contract is verified on Blockscout or Etherscan, and the source and tests
are public. **No third-party audit has been published yet.** Commissioning one is
the first use of protocol revenue ([Section 13](#13-roadmap)). Until then, users
and platforms should weigh the trust assumptions above accordingly.

---

## 10. Privacy and regulatory posture

*This section describes how RWA ID is designed. It is not legal advice, and no
formal legal opinion on RWA ID or RWAIDRH has been published.*

### 10.1 What RWA ID does and does not do

| RWA ID **does** | RWA ID **does not** |
|---|---|
| Issue readable names for wallets | Collect personal data |
| Resolve them through ENS | Perform KYC, AML or sanctions screening |
| Let platforms gate access on a public on-chain check | Verify or assert anything about a person |
| Split claim fees on-chain at claim time | Custody client funds or assets |

The closest analogy is a domain-name registry, not an identity-verification
provider: RWA ID records *that a name points to a wallet*, and says nothing about
who controls the wallet.

### 10.2 Data

- **On-chain:** Merkle roots, chosen labels, wallet addresses, records that
  holders chose to publish, and transaction history. All of it is public and
  permanent by the nature of a blockchain.
- **On IPFS:** each project's proof set, which lists labels and wallets. It is
  published by the platform, from the platform's browser.
- **Off-chain services:** the website and gateway are static or stateless and keep
  no user database; the hosting provider keeps standard request logs.

Wallet addresses and labels can be personal data under laws such as the GDPR when
they can be linked to a person. **Platforms are the controllers of the
link between a client and their wallet** and should choose labels with that in
mind — pseudonyms rather than legal names — because nothing published on-chain or
to IPFS can be erased.

### 10.3 Platform responsibilities

Platforms using RWA ID remain responsible for:

- KYC, AML and sanctions screening of their clients;
- deciding who is allowlisted, and revoking names when an account closes;
- the lawfulness of any label they publish;
- the regulatory status of the assets they issue and the services they provide;
- keeping their own records linking names to verified clients.

### 10.4 The token

RWAIDRH is not needed to use the protocol, confers no ownership of or revenue
from the operating company, and carries no governance rights. The founder's
allocation is time-locked and the launch liquidity cannot be withdrawn. Regulatory
treatment of tokens differs between jurisdictions and is unsettled in several;
nothing in this document is an offer to sell or a solicitation to buy RWAIDRH,
and it may not be lawful to acquire it in some jurisdictions.

---

## 11. Integration

### 11.1 Platform checklist

1. Get a little ETH on Robinhood Chain for gas, and a Safe (recommended) to own the
   project.
2. Create the project at [rwa-id.com/console](https://rwa-id.com/console), choosing
   the slug, treasury, fee and transferability.
3. Upload a `name,wallet` CSV and publish the root.
4. Choose who pays: set a fee, or fund a sponsor pool.
5. Share the claim link — `rwa-id.com/claim/?claim=<projectId>&proofs=<cid>&v=4` —
   or deliver names with `claimFor`.
6. Optionally set namespace artwork with `setProjectImage`.

```
name,wallet
joe,0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
ana,0x8a3e2F95A120C3d0B35F46aC77B2F9A5C028dE81
```

### 11.2 Resolving names

No RWA ID-specific code is needed. Any ENS-aware library follows the
`OffchainLookup` automatically:

```js
const wallet = await client.getEnsAddress({ name: 'joe.acme.rwa-id.eth' })   // viem
```

### 11.3 Reading the registry

A platform's own contracts and back-office can read Robinhood Chain directly. No
API key, webhook or vendor sits in the path:

```
projectIdBySlugHash(keccak256(slug))  → projectId
nameNodeFromHash(projectId, hash)     → node
resolveAddr(node)                     → holder (0 if unclaimed or revoked)
claimed(projectId, wallet)            → bool
revoked(projectId, nameHash)          → bool
fullName(tokenId)                     → "joe.acme.rwa-id.eth"
projectUsage(projectId)               → owner, totalClaimed, protocolFees
effectiveClaimFee(projectId)          → current price of a claim
```

A common pattern is gating: a vault or distribution contract on Robinhood Chain
checks `claimed(projectId, msg.sender)` before accepting a deposit, using the
platform's allowlist as an on-chain access list.

### 11.4 Resources

- Documentation: [rwa-id.com/docs](https://rwa-id.com/docs)
- Console: [rwa-id.com/console](https://rwa-id.com/console)
- Holder records: [rwa-id.com/names](https://rwa-id.com/names)
- Source: [github.com/RWA-ID/RWA-ID](https://github.com/RWA-ID/RWA-ID)

---

## 12. Deployed contracts

Every address is recorded in
[`protocol/deployments/robinhood.json`](protocol/deployments/robinhood.json).

### Robinhood Chain (4663)

| Contract | Address |
|---|---|
| **RWAIDv4.1** (registry) | [`0x85B09167aB330641f8e5F73E2e904C75FDFa8132`](https://robinhoodchain.blockscout.com/address/0x85B09167aB330641f8e5F73E2e904C75FDFa8132) |
| **RWAIDRecords** | [`0xb209023C4C4D5c997dEb6A2E672374e358182F37`](https://robinhoodchain.blockscout.com/address/0xb209023C4C4D5c997dEb6A2E672374e358182F37) |
| USDG (fee token, Paxos) | [`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`](https://robinhoodchain.blockscout.com/address/0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168) |
| **Protocol Safe** (2-of-3) | [`0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab`](https://robinhoodchain.blockscout.com/address/0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab) |
| **RWAIDRH** token | [`0xdd0A628926C0C944A603eD93bca325161cD4efc6`](https://robinhoodchain.blockscout.com/token/0xdd0A628926C0C944A603eD93bca325161cD4efc6) |
| RWAIDLiquidityLock | [`0x91442eda74bD0d3D0965F058d74c75A6f7E1308f`](https://robinhoodchain.blockscout.com/address/0x91442eda74bD0d3D0965F058d74c75A6f7E1308f) |
| RWAIDPlatformUnlock | [`0x6709D7b104B7283fac92DBbD9AFbd90Af7c233F0`](https://robinhoodchain.blockscout.com/address/0x6709D7b104B7283fac92DBbD9AFbd90Af7c233F0) |
| Founder VestingWallet | [`0x0A048950f66C14b517DF6B02F04f8db2d9F9f91d`](https://robinhoodchain.blockscout.com/address/0x0A048950f66C14b517DF6B02F04f8db2d9F9f91d) |
| Uniswap v3 pool (WETH/RWAIDRH, 1%) | [`0xe03f2d01Ca196B80C1048c7FC0213322400D05D3`](https://robinhoodchain.blockscout.com/address/0xe03f2d01Ca196B80C1048c7FC0213322400D05D3) |
| RWAIDLauncher | [`0xA36c2328dBcB408D23De5993b25C29aD1f806262`](https://robinhoodchain.blockscout.com/address/0xA36c2328dBcB408D23De5993b25C29aD1f806262) |

### Ethereum mainnet

| Contract | Address |
|---|---|
| **RwaIdOffchainResolver** (resolver of `rwa-id.eth`) | [`0x5Bf038c11A81E84795f1078A30A6eCF64fD5E5e0`](https://etherscan.io/address/0x5Bf038c11A81E84795f1078A30A6eCF64fD5E5e0) |
| Gateway signer | `0xDF8E6a113f98586608C3D7a4eab68a35A97602Af` |
| **Protocol Safe** (2-of-3) | [`0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab`](https://app.safe.global/home?safe=eth:0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab) |
| RWAIDv3 (legacy; names still resolve) | [`0x6413e9E6A0D4e05557463A66C34E18192324A2C7`](https://etherscan.io/address/0x6413e9E6A0D4e05557463A66C34E18192324A2C7) |

### Retired

| Contract | Address | Why |
|---|---|---|
| RWAIDv4.0 | `0xb99c4333DEb732B30D83f03cAb92fe855B21999a` (Robinhood Chain) | Replaced by v4.1 the same day, before any project existed |
| RwaIdWildcardResolverV2 | `0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1` (Ethereum) | Signatures not bound to the request or result ([5.2](#52-what-the-signature-binds)) |
| Old gateway signer | `0xC9fACcf3a77b553375017efFEe441D9770fAA723` | Trusted only by the retired resolver |
| RWAIDv2 | `0xD0B565C7134bDB16Fc3b8A9Cb5fdA003C37930c2` (Ethereum) | No `tokenURI`; superseded by v3 |

---

## 13. Roadmap

### Done

- **v4.1 registry** on Robinhood Chain with USDG fees, an enforced floor, sponsor
  pools, `claimFor`, ENSIP-15 labels and platform artwork.
- **Signature-bound resolver** on Ethereum, replacing V2.
- **RWAIDRecords**: multichain and text records.
- **36 reserved namespaces** until October 2029.
- **RWAIDRH** launch with permanent liquidity, usage-earned platform buckets and
  founder vesting.
- New site, console, claim page and holder page at rwa-id.com.

### Next

These are intentions, not commitments, and depend on adoption and revenue.

- **Third-party security audit** of the registry, records, resolver and token
  contracts, published in full.
- **Platform onboarding**: verifying reserved-namespace companies, activating their
  buckets, and onboarding platforms outside the reserved list through the
  open-platform pool.
- **Developer documentation** and integration examples for gating and back-office
  reads.
- **Gateway redundancy**: additional gateway URLs on the resolver so resolution
  does not depend on a single deployment.
- **ENSv2 readiness**: testing `rwa-id.eth`'s wildcard resolution under an ENSv2
  parent before moving the name itself.

---

## 14. Version history

| Version | Chain | Date | What changed |
|---|---|---|---|
| v1 | Linea | Jan 2025 | Hash-only registry and wildcard resolver |
| v2 | Ethereum | Apr 2025 | Projects, Merkle allowlists, USDC fees, soulbound option. No `tokenURI` |
| v3 | Ethereum | 1 Aug 2026 | On-chain metadata, labels claimed as strings, lowercase enforced. 25 slugs reserved |
| v4.0 | Robinhood Chain | 13 Oct 2026 | Superseded the same day, never used |
| **v4.1** | Robinhood Chain | 13 Oct 2026 | USDG, enforced floor, sponsor pools, `claimFor`, ENSIP-15 labels, platform artwork, `projectUsage`, `Ownable2Step`, 36 reserved slugs |
| Records + resolver | RH Chain + Ethereum | 13 Oct 2026 | Multichain and text records; signature-bound resolver replaces V2 |
| RWAIDRH | Robinhood Chain | 14 Oct 2026 | Token launch, permanent LP lock, platform buckets, founder vesting |

The Merkle leaf has not changed since v2, so allowlists carry across versions.

---

## 15. References

- [ENS documentation](https://docs.ens.domains/)
- [ENSIP-5: Text records](https://docs.ens.domains/ensip/5)
- [ENSIP-9: Multichain address resolution](https://docs.ens.domains/ensip/9)
- [ENSIP-10: Wildcard resolution](https://docs.ens.domains/ensip/10)
- [ENSIP-11: EVM-compatible chain address resolution](https://docs.ens.domains/ensip/11)
- [ENSIP-15: Name normalization](https://docs.ens.domains/ensip/15)
- [EIP-3668: CCIP-Read](https://eips.ethereum.org/EIPS/eip-3668)
- [EIP-721: Non-fungible tokens](https://eips.ethereum.org/EIPS/eip-721)
- [EIP-2612: Permit](https://eips.ethereum.org/EIPS/eip-2612)
- [EIP-4906: Metadata update extension](https://eips.ethereum.org/EIPS/eip-4906)
- [OpenZeppelin Contracts v5](https://docs.openzeppelin.com/contracts/5.x/)
- [Uniswap v3](https://docs.uniswap.org/contracts/v3/overview)
- [Safe](https://docs.safe.global/)

---

## Appendix A: Glossary

| Term | Meaning |
|---|---|
| **Namespace / slug** | A platform's segment of `rwa-id.eth`, e.g. `acme` in `acme.rwa-id.eth` |
| **Label** | One client's name within a namespace, e.g. `joe` |
| **Project** | The registry record for a namespace: owner, treasury, fee, allowlist root and settings |
| **Allowlist / proof set** | The platform's list of `(label, wallet)` pairs, its Merkle tree, and the per-wallet proofs pinned to IPFS |
| **Merkle root** | The 32-byte commitment to an allowlist stored on-chain |
| **Claim** | Minting a name to the wallet it was allowlisted for |
| **Sponsor pool** | USDG held for a project to pay its clients' claim fees |
| **Soulbound** | A name whose token cannot be transferred |
| **CCIP-Read** | EIP-3668: a contract asks the client to fetch data off-chain and return it with a proof |
| **Gateway** | The service that answers RWA ID's CCIP-Read requests with signed results |
| **Wildcard resolver** | ENSIP-10: one resolver answering for every name beneath a parent |
| **Node** | The ENS namehash of a name |
| **USDG** | Global Dollar, a USD stablecoin issued by Paxos, used for claim fees |
| **Safe** | A multi-signature smart-contract wallet; RWA ID's is 2-of-3 |

## Appendix B: Interfaces

Selected functions of RWAIDv4.1. The full ABI is published with the verified
source on Blockscout.

```solidity
// Platforms
function createProject(string slug, address treasury, uint256 claimFee, bool transferable) returns (uint256 projectId);
function updateMerkleRoot(uint256 projectId, bytes32 root, uint256 totalAllowlisted);
function updateClaimFee(uint256 projectId, uint256 claimFee);
function updateTreasury(uint256 projectId, address treasury);
function setProjectTransferable(uint256 projectId, bool transferable);
function setTokenTransferable(uint256 tokenId, bool transferable);
function setProjectImage(uint256 projectId, string uri);
function pauseProject(uint256 projectId);
function unpauseProject(uint256 projectId);
function revokeIdentity(uint256 projectId, uint256 tokenId);
function transferProjectOwnership(uint256 projectId, address newOwner);

// Fees and sponsorship
function fundSponsorship(uint256 projectId, uint256 amount);
function withdrawSponsorship(uint256 projectId, uint256 amount, address to);
function effectiveClaimFee(uint256 projectId) view returns (uint256);

// Claims
function claim(uint256 projectId, string label, bytes32[] proof);
function claimFor(uint256 projectId, address claimer, string label, bytes32[] proof);

// Reads
function projectIdBySlugHash(bytes32 slugHash) view returns (uint256);
function nameNodeFromHash(uint256 projectId, bytes32 nameHash) view returns (bytes32);
function resolveAddr(bytes32 node) view returns (address);
function claimed(uint256 projectId, address wallet) view returns (bool);
function revoked(uint256 projectId, bytes32 nameHash) view returns (bool);
function fullName(uint256 tokenId) view returns (string);
function projectUsage(uint256 projectId) view returns (address owner, uint256 totalClaimed, uint256 protocolFees);
```

---

## Contact

**Founder:** Hector Morel
**Partnerships:** [partner@rwa-id.com](mailto:partner@rwa-id.com)
**Website:** [rwa-id.com](https://rwa-id.com) · **X:** [@rwaidentity](https://x.com/rwaidentity)

RWA ID is operated by Only Buy Bitcoin LLC, a Delaware LLC doing business as RWA ID.

## Disclaimer

This whitepaper describes software as deployed on the date above, for information
only. It is not investment, legal or tax advice, and it is not an offer to sell or
a solicitation of an offer to buy any token or security. Smart contracts carry
risk, including the risk of bugs; no third-party audit has yet been published.
Always verify contract addresses against [Section 12](#12-deployed-contracts)
before interacting with them.
