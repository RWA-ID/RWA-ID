# RWA ID gateway

CCIP-Read ([EIP-3668](https://eips.ethereum.org/EIPS/eip-3668)) gateway for `*.rwa-id.eth`, running as a Cloudflare Worker.

`rwa-id.eth` uses **RwaIdOffchainResolver** (`0x5Bf038c11A81E84795f1078A30A6eCF64fD5E5e0`, Ethereum mainnet, Safe-owned) since 13 October 2026. For any query under `rwa-id.eth` it reverts with `OffchainLookup` to `https://gateway.rwa-id.com/{sender}/{data}.json`. This Worker reads the registry and records, then signs

```
keccak256(0x1900 ‖ resolver ‖ expires ‖ keccak256(request) ‖ keccak256(result))
```

with the key behind the resolver's trusted signer `0xDF8E6a113f98586608C3D7a4eab68a35A97602Af`. So a signature is valid only for that resolver, that exact query and that exact answer, and only until it expires (the resolver caps expiry at 1 hour). This is the ENS offchain-resolver scheme, implemented in `src/offchain.js`.

## What it answers

| Query | Answer |
|---|---|
| `addr(node)` / coin type 60 | The name's current holder, from `resolveAddr(node)` on the registry |
| Other EVM coin types (ENSIP-11) | The holder's record in RWAIDRecords, else their default-EVM record (`0x80000000`), else the holder |
| Bitcoin, Solana, others (ENSIP-9) | The holder's record in RWAIDRecords (`0xb209023C4C4D5c997dEb6A2E672374e358182F37`, Robinhood Chain) |
| `text(node, key)` | The holder's text record in RWAIDRecords |
| Unknown name | A signed empty answer ("no record"), not an error |

## Lookup order

1. **RWAIDv4.1** on Robinhood Chain (4663), `0x85B09167aB330641f8e5F73E2e904C75FDFa8132`: every new namespace, plus its records.
2. **RWAIDv3** on Ethereum mainnet, `0x6413e9E6A0D4e05557463A66C34E18192324A2C7`: legacy namespaces, read only when v4.1 has no project for the slug. These names have an ETH address only.

v4.1 is checked first so a slug created on v3 later can never shadow a v4 namespace. Any RPC failure returns a 500 and nothing is signed. A failed v4.1 read never falls through to v3.

### Legacy path

The retired `RwaIdWildcardResolverV2` (`0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1`) and its signer `0xC9fACcf3a77b553375017efFEe441D9770fAA723` are still served in their original wire format. That keeps any client holding the old resolver working, but `rwa-id.eth` no longer points there.

## Endpoints

| Path | |
|---|---|
| `GET /{sender}/{data}.json`, `POST /` | EIP-3668. Returns `{ data, signer }` |
| `GET /resolve?name=joe.acme.rwa-id.eth` | Debug: what would be signed, and from which registry |
| `GET /health` | Both signers, both registries, the offchain resolver, the records contract and RPC status |

Response encoding:

- **Offchain resolver** (live): `abi.encode(bytes result, uint64 expires, bytes sig)`, signed as above.
- **Legacy V2 resolver**: `abi.encode(bytes32 node, address addr, bytes32 messageHash, bytes sig)`, where `messageHash` is the EIP-191 hash of `keccak256(abi.encodePacked(registry, node, addr))`.

## Run, test, deploy

```bash
npm install
npm test                 # unit tests, no network
npx wrangler deploy
```

Secrets, set with `npx wrangler secret put <NAME>`. Never declare them under `[vars]`, because a var of the same name shadows the secret:

- `GATEWAY_V2_SIGNER_PRIVATE_KEY`: must derive to the offchain resolver's signer (`0xDF8E…02Af`)
- `GATEWAY_SIGNER_PRIVATE_KEY`: the legacy V2 resolver's `trustedSigner` (`0xC9fA…A723`)
- `ALCHEMY_API_KEY`: used for both chains, with public RPCs as fallback
- optional `ROBINHOOD_RPC_URL`, `MAINNET_RPC_URL`

End-to-end test against the real mainnet resolver, with a local Robinhood Chain fork standing in for v4 claims:

```bash
cd protocol && FORK_ROBINHOOD=1 npx hardhat node          # terminal 1
GATEWAY_SIGNER_PRIVATE_KEY=… ALCHEMY_API_KEY=… node gateway/scripts/e2e-fork.mjs   # terminal 2
```

It creates a namespace and a claim on the fork, then resolves names through the ENS Universal Resolver on mainnet, with the CCIP-Read hop answered by this Worker. It also checks that the signatures are byte-identical to the previous gateway's.

The offchain-resolver path has its own rehearsal on forks of **both** chains (`scripts/e2e-offchain.mjs`). It deploys RWAIDRecords and the resolver on the forks, sets BTC, SOL, default-EVM and text records, and resolves through the real ENS Universal Resolver. Use `anvil` for the mainnet fork, because `hardhat node` cannot fork Ethereum mainnet (EDR #911). The exact commands are in the script header.

## History

Until October 2026 this gateway ran as an Express app on Replit, reading only v3 on mainnet. The Worker kept that wire format and signer, so no on-chain change was needed to replace it. On 13 October 2026 `rwa-id.eth` moved to RwaIdOffchainResolver, which binds every signature to the question and the answer.
