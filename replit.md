# RWA-ID CCIP Gateway

## Overview

This is an ENS CCIP-Read (Cross-Chain Interoperability Protocol) gateway server for the RWA-ID project. It enables ENS name resolution for a custom subdomain structure (`<label>.<slug>.rwa-id.eth`) by acting as an off-chain resolver that reads data from a smart contract registry deployed on the Linea blockchain.

The gateway intercepts ENS resolution requests, parses the DNS-encoded name, queries the on-chain RWA-ID registry contract on Linea, and returns cryptographically signed responses back to the requester — fulfilling the CCIP-Read (EIP-3668) pattern.

There are two implementations present:
- **Root `index.js`**: An earlier/partial implementation
- **`rwaid-gateway/index.js`**: A newer, cleaner implementation (this is the primary one to build from)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend

- **Runtime**: Node.js with Express as the HTTP server
- **Entry point**: `rwaid-gateway/index.js` (preferred) or root `index.js`
- **Port**: Configurable via `PORT` env var, defaults to `5000`

### Name Resolution Flow

1. An ENS resolver sends a CCIP-Read request to this gateway HTTP server
2. The gateway receives a DNS-encoded name (e.g., `<label>.<slug>.rwa-id.eth`)
3. It parses the name into `label` and `slug` components using `parseName()`
4. It computes `labelhash` values (keccak256 of lowercased strings)
5. It queries the on-chain `RWA_ID_REGISTRY` contract on Linea for:
   - `projectIdBySlugHash(bytes32)` → gets the project ID for the slug
   - `nameNodeFromHash(uint256, bytes32)` → gets the ENS node for the label under that project
   - `nodeAddr(bytes32)` → resolves the address for that node
6. The gateway signs the response using `GATEWAY_SIGNER_PRIVATE_KEY` and returns it

### Smart Contract Interface (Registry ABI)

The gateway interacts with a deployed registry contract using three read-only functions:
- `projectIdBySlugHash(bytes32) → uint256`
- `nameNodeFromHash(uint256, bytes32) → bytes32`
- `nodeAddr(bytes32) → address`

### Name Format

Names must follow the pattern: `<label>.<slug>.rwa-id.eth`
- `label`: the individual name being resolved
- `slug`: identifies the RWA project/namespace
- Suffix must always be `rwa-id.eth`

### Caching

All responses explicitly disable caching (`Cache-Control: no-store`, `Pragma: no-cache`) to ensure fresh blockchain data is always returned.

## External Dependencies

### Blockchain
- **Linea Network**: L2 blockchain where the RWA-ID registry contract lives. Accessed via JSON-RPC (`LINEA_RPC_URL`).

### NPM Packages
- **ethers v6**: Blockchain interaction, ABI encoding/decoding, wallet signing, keccak256 hashing
- **express v4/v5**: HTTP server framework for handling CCIP-Read gateway requests
- **dotenv**: Environment variable management

### Required Environment Variables
| Variable | Purpose |
|---|---|
| `LINEA_RPC_URL` | JSON-RPC endpoint for the Linea network |
| `RWA_ID_REGISTRY` | Deployed address of the on-chain registry contract |
| `GATEWAY_SIGNER_PRIVATE_KEY` | Private key used to sign CCIP-Read responses |
| `PORT` | HTTP server port (optional, defaults to 5000) |

### Standards
- **EIP-3668 (CCIP-Read)**: The off-chain lookup standard this gateway implements
- **ENS**: Ethereum Name Service naming and resolution conventions