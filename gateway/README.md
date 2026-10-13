# RWA ID gateway

CCIP-Read ([EIP-3668](https://eips.ethereum.org/EIPS/eip-3668)) gateway for `*.rwa-id.eth`, running as a Cloudflare Worker.

`rwa-id.eth` uses the wildcard resolver `RwaIdWildcardResolverV2` (`0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1`, Ethereum mainnet). For `addr()` it reverts with `OffchainLookup` to `https://gateway.rwa-id.com/{sender}/{data}.json`. This Worker reads the registry, signs the answer, and the resolver accepts any response signed by its `trustedSigner` (`0xC9fACcf3a77b553375017efFEe441D9770fAA723`).

## Lookup order

1. **RWAIDv4** on Robinhood Chain (4663), `0xb99c4333DEb732B30D83f03cAb92fe855B21999a`: every new namespace.
2. **RWAIDv3** on Ethereum mainnet, `0x6413e9E6A0D4e05557463A66C34E18192324A2C7`: legacy namespaces, read only when v4 has no project for the slug.

v4 is checked first so that a slug created on v3 later can never shadow a v4 namespace. Any RPC failure is a 500, and nothing is signed. A failed v4 read never falls through to v3.

## Endpoints

| Path | |
|---|---|
| `GET /{sender}/{data}.json`, `POST /` | EIP-3668. Returns `{ data, signer }` |
| `GET /resolve?name=joe.acme.rwa-id.eth` | Debug: what would be signed, and from which registry |
| `GET /health` | Signer, both registries, and each chain's status |

Response encoding (fixed by the resolver): `abi.encode(bytes32 node, address addr, bytes32 messageHash, bytes sig)`, where `messageHash` is the EIP-191 hash of `keccak256(abi.encodePacked(registry, node, addr))`.

## Run, test, deploy

```bash
npm install
npm test                 # unit tests, no network
npx wrangler deploy
```

Secrets, set with `npx wrangler secret put <NAME>`. Never declare them under `[vars]`, because a var of the same name shadows the secret:

- `GATEWAY_SIGNER_PRIVATE_KEY`: must derive to the resolver's `trustedSigner`
- `ALCHEMY_API_KEY`: used for both chains, with public RPCs as fallback
- optional `ROBINHOOD_RPC_URL`, `MAINNET_RPC_URL`

End-to-end test against the real mainnet resolver, with a local Robinhood Chain fork standing in for v4 claims:

```bash
cd protocol && FORK_ROBINHOOD=1 npx hardhat node          # terminal 1
GATEWAY_SIGNER_PRIVATE_KEY=… ALCHEMY_API_KEY=… node gateway/scripts/e2e-fork.mjs   # terminal 2
```

It creates a namespace and a claim on the fork, then resolves names through the ENS Universal Resolver on mainnet, with the CCIP-Read hop answered by this Worker. It also checks that the signatures are byte-identical to the previous gateway's.

## History

Until October 2026 this gateway ran as an Express app on Replit, reading only v3 on mainnet. The Worker keeps its wire format and signer, so no on-chain change was needed to replace it.
