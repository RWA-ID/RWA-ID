# RWA-ID Admin Dashboard

The official project owner dashboard for the [RWA-ID](https://rwa-id.com) protocol — a decentralized, cross-chain identity registry for institutional real-world asset platforms built on Ethereum mainnet.

**Live:** [dashboard.rwa-id.com](https://dashboard.rwa-id.com)

---

## Overview

RWA-ID lets institutional RWA platforms issue verifiable, ENS-compatible on-chain identities to their clients. Each project owner gets a subdomain namespace (e.g. `*.acme.rwa-id.eth`) and full control over who can claim an identity, what it costs, and whether tokens are transferable or soulbound.

This dashboard is the admin interface for project owners. It connects directly to the `RWAIDv2` smart contract on Ethereum mainnet — no backend, no indexer, all reads go through public RPC.

**Contract:** [`0xD0B565C7134bDB16Fc3b8A9Cb5fdA003C37930c2`](https://etherscan.io/address/0xD0B565C7134bDB16Fc3b8A9Cb5fdA003C37930c2)

---

## Features

### Project Management
- Connect any wallet and automatically detect all RWA-ID projects you own
- View live project stats: total claimed identities, total revenue, current claim fee, treasury address, transferability setting, and active/paused status

### Allowlist (Merkle Root)
Manage the allowlist that controls who can claim an identity under your project.

- **CSV upload** — upload a `name,wallet` CSV file; the dashboard computes the Merkle tree locally, pins it to IPFS via Pinata, and submits the new root on-chain in one transaction
- **Manual entry** — add name + wallet rows one at a time; optionally load an existing tree from an IPFS CID to extend it without losing existing entries
- Merkle leaf format: `keccak256(abi.encodePacked(wallet, nameHash))`

### Claim Fee
- View the current per-claim fee (paid in USDC)
- Update the fee with a single on-chain transaction
- The dashboard enforces the protocol minimum fee set by the contract owner

### Treasury
- View the current treasury address that receives claim fee revenue
- Update the treasury address with a single on-chain transaction

### Transferability
- **Project default** — set whether newly minted tokens in your project are transferable or soulbound (non-transferable) by default
- **Per-token override** — look up any claimed identity by name (e.g. `joe.acme.rwa-id.eth`) and override transferability on that specific token; click to pre-fill the token ID

### Identity Lookup
Search for any claimed name directly on-chain — no event log scanning required:
1. Enter the name (e.g. `joe`)
2. The dashboard hashes it, calls `nameNodeFromHash`, then multicalls `nodeToTokenId`, `nodeClaimed`, and `revoked`
3. Returns the ENS-style name, claim status (claimed / not claimed / revoked), and token ID

### Revoke Identity
Permanently revoke a claimed identity:
- Look up any identity by name to pre-fill the token ID
- Revocation burns the token, clears its ENS resolution (gateway returns `address(0)`), and blacklists the name from ever being re-claimed under this project
- Requires explicit confirmation checkbox before the transaction is submitted

### Pause / Unpause Project
- Pause your project to stop new claims while keeping existing identities intact
- Unpause to re-open claiming

### Transfer Project Ownership
- Transfer ownership of your project to a new wallet address
- The new owner immediately gains full admin control

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 19 + Vite 7 |
| Wallet / Web3 | Wagmi v3 + Reown AppKit (WalletConnect) |
| Chain reads | viem v2 (direct public RPC — no WalletConnect proxy) |
| Merkle trees | merkletreejs |
| IPFS pinning | Pinata API |
| Chain / wallet icons | @web3icons/react |
| Styling | Tailwind CSS v3 + Space Grotesk + Syne fonts |
| Hosting | Cloudflare Pages |

All on-chain reads use [PublicNode](https://ethereum.publicnode.com) directly, bypassing the WalletConnect RPC proxy which blocks `eth_getLogs`. Wallet signing still goes through WalletConnect normally.

---

## Local Development

### Prerequisites
- Node.js 18+
- A [WalletConnect Cloud](https://cloud.walletconnect.com) project ID
- A [Pinata](https://pinata.cloud) API JWT (for IPFS pinning in the Merkle panel)

### Setup

```bash
git clone https://github.com/RWA-ID/RWA-ID-Dashboard.git
cd RWA-ID-Dashboard
npm install
```

Create a `.env` file in the project root:

```env
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_PINATA_JWT=your_pinata_api_jwt
```

### Run

```bash
npm run dev
```

### Build

```bash
npm run build
```

---

## Deployment

The dashboard is deployed to Cloudflare Pages. Any push to `main` can be set up to auto-deploy via the Cloudflare Pages GitHub integration.

Manual deploy:

```bash
npm run build
npx wrangler pages deploy dist --project-name rwa-id-dashboard
```

The `public/_redirects` file ensures all routes fall back to `index.html` for client-side routing.

---

## Contract Reference

| Function | Description |
|---|---|
| `projects(projectId)` | Returns all project metadata |
| `nameNodeFromHash(projectId, nameHash)` | Computes the ENS node for a name under a project |
| `nodeToTokenId(node)` | Returns the token ID for a given ENS node |
| `nodeClaimed(node)` | Returns whether an ENS node has been claimed |
| `revoked(projectId, nameHash)` | Returns whether a name has been revoked |
| `tokenMetadata(tokenId)` | Returns `(projectId, nameHash, claimedAt)` for a token |
| `updateMerkleRoot(projectId, newRoot, totalAllowlisted)` | Update allowlist Merkle root |
| `updateClaimFee(projectId, newFee)` | Update per-claim fee |
| `updateTreasury(projectId, newTreasury)` | Update treasury address |
| `setProjectTransferable(projectId, transferable)` | Set project-level transferability default |
| `setTokenTransferable(tokenId, transferable)` | Override transferability on a specific token |
| `pauseProject(projectId)` / `unpauseProject(projectId)` | Pause or unpause claiming |
| `transferProjectOwnership(projectId, newOwner)` | Transfer project admin rights |
| `revokeIdentity(projectId, tokenId)` | Permanently revoke and blacklist an identity |

---

## License

MIT