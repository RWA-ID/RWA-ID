# rwa-id-gateway

ENS **CCIP-Read (EIP-3668)** gateway for `<label>.<slug>.rwa-id.eth`.

Names under `rwa-id.eth` are not stored in the ENS registry. A wildcard resolver on
Ethereum mainnet reverts with `OffchainLookup`, pointing wallets at this service. The
gateway reads the RWA ID registry, signs the answer, and the resolver's
`resolveWithProof` verifies that signature on-chain before the wallet accepts it.

```
wallet → UniversalResolver → RwaIdWildcardResolver
                                   │  reverts OffchainLookup(gateway, callData)
                                   ▼
                         this gateway  →  RWAIDv3 registry (mainnet)
                                   │  signs (registry, node, addr)
                                   ▼
                         resolveWithProof recovers the signer → address
```

## Deployed addresses (Ethereum mainnet)

| | |
|---|---|
| RWAIDv3 registry | `0x6413e9E6A0D4e05557463A66C34E18192324A2C7` |
| ENS wildcard resolver | `0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1` |
| Trusted gateway signer | `0xC9fACcf3a77b553375017efFEe441D9770fAA723` |

The resolver verifies **only** that the signature came from the trusted signer — it does
not inspect which registry the gateway read. Pointing `RWA_ID_REGISTRY` at the wrong
contract therefore produces answers that are cryptographically valid and wrong, with
nothing downstream able to detect it. There is deliberately **no default**: the process
exits when the variable is unset, so a misconfigured deploy fails loudly.

Rotating the signer key breaks every name until the resolver's `trustedSigner` is updated
via the Safe. Changing the registry needs no resolver change.

## Endpoints

| Route | Purpose |
|---|---|
| `GET /health` | chain id, masked RPC list, registry, signer |
| `GET /resolve?name=…` | human-readable resolution + signature |
| `GET /ccip?name=…` | ABI-encoded resolver payload |
| `GET\|POST /:sender/:data.json` | the EIP-3668 endpoint wallets actually call |

## Configuration

| Variable | Required | Notes |
|---|---|---|
| `RWA_ID_REGISTRY` | yes | RWAIDv3 address; no default, exits if missing |
| `GATEWAY_SIGNER_PRIVATE_KEY` | yes | must match the resolver's `trustedSigner` |
| `ALCHEMY_API_KEY` | no | primary RPC; falls back to public nodes without it |
| `PORT` | no | defaults to 5000 |

Requests go through an `ethers.FallbackProvider` — Alchemy, then Cloudflare, publicnode
and 1rpc at quorum 1 — so one provider outage does not take resolution down. The Alchemy
URL embeds the key, so it is masked everywhere it could surface: `/health`, startup logs,
and error responses.

## Name format

`<label>.<slug>.rwa-id.eth`, e.g. `bill.test100.rwa-id.eth` — `slug` identifies the
project, `label` the identity within it. Both are lowercased before hashing, so a name
registered with uppercase characters resolves under its lowercase form.

## Running

```bash
cd rwaid-gateway
npm install
node index.js
```

## Deploying

This runs on Replit autoscale. `.replit` starts it with
`cd rwaid-gateway && npm install && node index.js`.

**A git push does not deploy anything.** The deployment serves the last *published*
snapshot, which is independent of the workspace and of this repo — a clean working tree
does not mean the running service matches this code. Any change here requires a **Publish**
in Replit to take effect. Confirm what is actually live with `/health`.
