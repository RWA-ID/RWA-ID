# RWA ID — site and console

One Vite build that serves both hostnames:

- **[rwa-id.com](https://rwa-id.com)**: the site, docs, claim page, name manager and token section, with the console at `/console`.
- **[dashboard.rwa-id.com](https://dashboard.rwa-id.com)**: the console at `/`.

It talks to **RWAIDv4.1** (`0x85B09167aB330641f8e5F73E2e904C75FDFa8132`) and **RWAIDRecords** (`0xb209023C4C4D5c997dEb6A2E672374e358182F37`) on Robinhood Chain (4663), straight from the browser. There is no backend and no indexer. See the [root README](../../README.md) for the protocol.

## Routes

| Path | |
|---|---|
| `/` | Site: product, wallets, how it works, reserved namespaces, `#token` (RWAIDRH) |
| `/console` | Platform console (`/` on dashboard.rwa-id.com) |
| `/claim/?claim=<projectId>&proofs=<cid>&v=4` | Client claim page. The wallet is detected from the proof set |
| `/names` | Holders add other-chain addresses and text records (RWAIDRecords) |
| `/docs` | Integration and contract reference (`src/lib/docsContent.js`) |
| `/terms`, `/privacy`, `/refunds` | Legal (`src/lib/legalContent.js`) |
| `/tokenlist.json`, `/token/*` | RWAIDRH token list and logo, served with CORS (`public/_headers`) |

Each route ships as a real HTML file with its own title and OG card. `scripts/gen-pages.mjs` writes them, `scripts/render-og.mjs` renders the cards and icons, and `public/_redirects` maps them ahead of the SPA fallback.

## Console screens

| Screen | Contract calls |
|---|---|
| Create project | `createProject(slug, treasury, claimFee, transferable)`, with a live slug availability check |
| Overview / Projects | Every project the wallet owns, with claim counts and status |
| Allowlist | CSV → Merkle tree in the browser → proof set pinned to IPFS → `updateMerkleRoot`. Loads the live set to append |
| Claim fee | `updateClaimFee`, shown against the 0.50 USDG floor |
| Sponsorship | `fundSponsorship` / `withdrawSponsorship`, and delivery with `claimFor` |
| Treasury | `updateTreasury` |
| Transferability | `setProjectTransferable`, per-token `setTokenTransferable` |
| Artwork | `setProjectImage` (ipfs, https or ar) |
| Availability | `pauseProject` / `unpauseProject` |
| Registry | Look up any name in the project, and `revokeIdentity` |
| Ownership | `transferProjectOwnership` |

The console declares its own ABI (`src/lib/contracts.js`). `protocol/scripts/check-dashboard-abi.mjs` fails if it drifts from the compiled contract.

## Develop

```bash
npm install
npm run dev
```

`.env.local`:

```env
VITE_WALLETCONNECT_PROJECT_ID=…
VITE_PINATA_JWT=…            # allowlist proof pinning
# VITE_ROBINHOOD_RPC=…       # test builds only: point every read at one node (e.g. a local fork)
```

Stack: React 19, Vite 7, wagmi 2 + Reown AppKit, viem 2, merkletreejs, plain CSS (`src/styles.css`). Reads go to the public Robinhood Chain RPCs in `src/lib/chain.js`.

## Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name rwa-id-dashboard --branch main
```

The Pages project is **not git-connected**, so merging to `main` deploys nothing.

## License

MIT
