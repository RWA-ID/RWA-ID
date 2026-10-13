# RWA-ID - Decentralized Identity Registry

## Overview

A production-ready web application for creating and managing decentralized identity namespaces on Ethereum Mainnet. The platform enables organizations to create identity registries and users to claim identity tokens through Merkle proof verification. Proofs are stored on IPFS via Pinata, and users claim via shareable URLs.

## Project Structure

```
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── nav-bar.tsx    # Shared navigation bar
│   │   │   ├── theme-provider.tsx
│   │   │   ├── theme-toggle.tsx
│   │   │   ├── wallet-button.tsx
│   │   │   └── stepper.tsx
│   │   ├── lib/
│   │   │   ├── abi.ts         # Contract ABI (v2) and addresses
│   │   │   ├── wagmi-config.ts # Web3 configuration (RainbowKit)
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   ├── pages/
│   │   │   ├── landing.tsx    # Landing page (/)
│   │   │   ├── console.tsx    # Platform console (/console)
│   │   │   ├── claim-ipfs.tsx # IPFS-based claim page (/claim/:projectId/:cid)
│   │   │   └── not-found.tsx
│   │   ├── App.tsx
│   │   └── index.css
│   └── index.html
├── server/                    # Backend Express server
│   ├── merkle.ts              # Merkle tree utilities
│   ├── routes.ts              # API routes (including IPFS upload)
│   ├── storage.ts             # In-memory storage
│   └── index.ts
├── shared/
│   └── schema.ts              # Shared TypeScript schemas
└── README.md                  # User documentation
```

## Key Technologies

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui
- **Web3**: wagmi v2, viem, RainbowKit v2, merkletreejs
- **Backend**: Express.js
- **IPFS**: Pinata (for proof storage)
- **Build**: Vite

## Domain Routes

- `/` - Landing page with hero, features, and how-it-works accordion
- `/console` - Platform console with 5-step onboarding wizard
- `/claim/:projectId/:cid` - IPFS-based claim page (users arrive via shareable URL)

## API Endpoints

### POST /api/platform/upload
- **Purpose**: Parse CSV and generate Merkle tree
- **Body**: `{ slug: string, csvText: string }`
- **Returns**: `{ merkleRoot: string, rowCount: number, proofs: Record<address, {name, nameHash, proof}> }`

### POST /api/upload-proofs
- **Purpose**: Upload proof JSON to IPFS via Pinata
- **Body**: `{ projectId: string, root: string, entries: [{name, address, nameHash, proof}] }`
- **Returns**: `{ cid: string }`
- **Requires**: `PINATA_JWT` environment variable

### GET /api/proof
- **Purpose**: Generate Merkle proof for eligibility check
- **Query**: `?slug=X&name=Y&address=Z`
- **Returns**: `{ proof: string[], nameHash: string, eligible: boolean }`

### GET /api/project/:slug
- **Purpose**: Get project metadata
- **Returns**: `{ slug, merkleRoot, entryCount, createdAt }`

### GET /api/claimable
- **Purpose**: Get all claimable identities for a wallet
- **Query**: `?address=0x...`
- **Returns**: `{ claims: [{ slug, projectId, name, nameHash, proof }] }`

## Merkle Tree Implementation (CRITICAL)

### Hash Format
```javascript
// slugHash
slugHash = keccak256(toBytes(slug.trim().toLowerCase()))

// nameHash
nameHash = keccak256(toBytes(name.trim().toLowerCase()))

// leaf
leaf = keccak256(abi.encodePacked(address, nameHash))
// where address is 20 bytes, nameHash is 32 bytes
```

- Tree uses `merkletreejs` with `sortPairs: true`
- Address is converted to lowercase (20 bytes)
- Name is trimmed and converted to lowercase, then hashed to 32 bytes

## Contract Interaction (v2)

**Contract Address (RWAIDv2)**: `0xD0B565C7134bDB16Fc3b8A9Cb5fdA003C37930c2`
**USDC**: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
**Chain**: Ethereum Mainnet (Chain ID: 1)

### ABI Exports (from abi.ts)
- `rwaIdV2Abi` - Full contract ABI
- `RWAID_V2_ADDRESS` - Contract address
- `usdcAbi` - USDC ABI (approve/allowance/balanceOf)
- `USDC_ADDRESS` - USDC contract address
- `CHAIN_ID` - 1 (Ethereum Mainnet)

### Functions Used (v2)
- `createProject(slug, treasury, claimFee, transferable)` - Create new project (nonpayable)
- `updateMerkleRoot(projectId, newRoot, newTotalAllowlisted)` - Update Merkle root
- `claim(projectId, nameHash, proof)` - Claim identity token
- `claimed(projectId, address)` - Check if address already claimed (view)
- `projects(projectId)` - Read project data: [owner, slug, slugHash, treasury, claimFee, transferable, merkleRoot, active, totalClaimed, totalRevenue]
- `minimumClaimFee()` - Read minimum claim fee (view)
- `projectIdBySlugHash(slugHash)` - Look up project ID by slug hash (view, returns 0 if not found)
- `reservedTo(slugHash)` - Check which address a slug is reserved for (view)
- `reservationExpiry(slugHash)` - Check when a slug reservation expires (view)

### Project ID Lookup
`projectIdBySlugHash(slugHash)` used in slug availability checker. For user project discovery, console still scans `projects(1..50)` matching by owner address.

### Slug Availability (Create Step)
- Debounced 500ms check on slug input using `projectIdBySlugHash`, `reservedTo`, `reservationExpiry`
- Three states: available (green), reserved (amber), taken (red)
- Create Project button disabled unless slug shows as available

## Environment Variables

| Variable | Description |
|----------|-------------|
| VITE_REOWN_PROJECT_ID | RainbowKit/WalletConnect project ID |
| SESSION_SECRET | Express session secret |
| PINATA_JWT | Pinata API JWT for IPFS uploads (server-side only) |

## User Flows

### Platform Console (5 Steps - New Project)
1. Connect Wallet & Select Project → Ethereum Mainnet, enter/select slug
2. Create Project → slug, treasury address, claim fee (USD → USDC 6-decimal), transferable toggle
3. Upload CSV → name,address pairs; editable Project ID field
4. Update Merkle Root → On-chain transaction with gas estimation
5. Complete → Auto-uploads proofs to IPFS, generates shareable claim URL

### Platform Console (4 Steps - Existing Project)
1. Connect Wallet & Select Project → Select from owned projects list
2. Upload CSV → name,address pairs; Project ID auto-filled
3. Update Merkle Root → On-chain transaction
4. Complete → Auto-uploads proofs to IPFS, generates updated claim URL

### IPFS Claim Flow (End User)
1. User opens shareable URL: `/claim/{projectId}/{ipfsCid}`
2. App fetches proofs JSON from IPFS (tries Pinata, Cloudflare, ipfs.io gateways)
3. User connects wallet → entry auto-detected from proof file
4. If claim fee > 0: Approve USDC spend → auto-proceeds to claim
5. Claim identity on-chain → shows ENS name: `{name}.{slug}.rwa-id.eth`

## Development Notes

- Storage is in-memory (data resets on restart)
- CSV should not be logged for privacy
- Frontend uses Inter and Space Grotesk fonts
- Dark/light theme support with localStorage persistence
- Claim fee input is in USD, converted to USDC 6-decimal on-chain (e.g., $1.00 → 1000000)
- Fee display uses `formatUnits(fee, 6)` from viem for precision-safe bigint conversion
- No toast notifications — errors displayed inline
- Wallet stack: RainbowKit v2 + wagmi v2 + viem
- NavBar only shows "Platform Console" link — claim page reached via shareable URL only
- IPFS gateways tried in order: Pinata → Cloudflare → ipfs.io (10s timeout each)
