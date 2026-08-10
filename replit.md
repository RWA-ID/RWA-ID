# RWA-ID CCIP Gateway

## Overview

An ENS CCIP-Read (EIP-3668) gateway for `<label>.<slug>.rwa-id.eth`. It acts as the
off-chain half of a wildcard resolver: a resolver on **Ethereum mainnet** reverts with
`OffchainLookup`, the wallet calls this service, and this service reads the RWA ID
registry and returns a **signed** answer that the resolver's `resolveWithProof` verifies
on-chain.

There is one implementation: **`rwaid-gateway/index.js`**. (A duplicate at the repo root
was removed — it was never the deployed file and reading it gave the wrong picture of
production.)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend

- **Runtime**: Node.js with Express
- **Entry point**: `rwaid-gateway/index.js` — the only implementation
- **Port**: `PORT`, defaults to `5000`

### Name Resolution Flow

1. A wallet's ENS lookup hits the mainnet wildcard resolver, which reverts `OffchainLookup`
2. The wallet calls this gateway with the DNS-encoded name
3. `parseName()` splits it into `label` and `slug`
4. `labelhash` = keccak256 of the **lowercased** string (uppercase registrations resolve
   under their lowercase form)
5. Against the registry on mainnet:
   - `projectIdBySlugHash(bytes32) → uint256` (0 means unknown project → 404)
   - `nameNodeFromHash(uint256, bytes32) → bytes32`
   - `resolveAddr(bytes32) → address` — returns `ownerOf(nodeToTokenId[node])`, so a
     transfer is reflected immediately
6. The gateway signs `(registry, node, addr)` with `GATEWAY_SIGNER_PRIVATE_KEY` and returns it

`resolveAddr` is required. The v1 `nodeAddr(bytes32)` mapping does **not** exist on
v2/v3 and reverts — using it silently breaks every lookup.

### Error handling

Every failure path returns an HTTP error; the gateway never signs an answer it did not
actually read. A signed empty would be verified as authentic by `resolveWithProof` and
cached by wallets as "this name has no address" — strictly worse than an error, which
makes clients retry. Keep it that way: do not add a `catch` that returns a plausible
value on a read path.

### RPC

An `ethers.FallbackProvider` over Alchemy (when `ALCHEMY_API_KEY` is set) then
`cloudflare-eth.com`, `ethereum-rpc.publicnode.com` and `1rpc.io/eth`, at quorum 1. One
provider outage does not take resolution down.

The Alchemy URL embeds the API key, so it is masked (`maskRpc`) in `/health`, in startup
logs, and in error responses (`safeError`). Never log or return an RPC URL unmasked.

### Caching

Responses set `Cache-Control: no-store` so wallets always get fresh chain data.

## External Dependencies

### Blockchain

**Ethereum mainnet.** The registry has lived on mainnet since v2 — this is not a Linea
deployment, despite the historical `LINEA_RPC_URL` variable name in older revisions.

| | |
|---|---|
| RWAIDv3 registry | `0x6413e9E6A0D4e05557463A66C34E18192324A2C7` |
| ENS wildcard resolver | `0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1` |
| Trusted signer | `0xC9fACcf3a77b553375017efFEe441D9770fAA723` |

The resolver checks only that the signature came from the trusted signer — it never
inspects which registry was read. A wrong `RWA_ID_REGISTRY` yields valid-looking, wrong
answers, so there is no default and the process exits when it is unset.

### NPM Packages

- **ethers v6** — contract reads, ABI coding, signing
- **express v4** — HTTP server
- **dotenv** — env loading

### Required Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `RWA_ID_REGISTRY` | yes | registry address; no default, exits if unset |
| `GATEWAY_SIGNER_PRIVATE_KEY` | yes | must match the resolver's `trustedSigner` |
| `ALCHEMY_API_KEY` | no | primary RPC; public fallbacks used without it |
| `PORT` | no | defaults to 5000 |

## Deploying

`.replit` runs `cd rwaid-gateway && npm install && node index.js`.

**Pushing to GitHub does not deploy.** The autoscale deployment serves the last
**Published** snapshot, independent of the workspace and of git. A clean working tree does
not mean the running service matches this code — commits can sit unpublished while an
older build serves traffic. Any change requires a **Publish**. Verify what is actually
live with `/health`, which reports the registry, signer and masked RPC list.

## Standards

- **EIP-3668 (CCIP-Read)** — the off-chain lookup standard implemented here
- **ENS** — naming and resolution conventions
