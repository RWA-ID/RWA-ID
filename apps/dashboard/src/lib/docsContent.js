// Technical documentation, rendered in-app by DocsPage. Content only — the
// renderer owns all markup. This replaces the old external Notion overview,
// which documented v2 and sent readers off the console to read it.
//
// Blocks are discriminated by `t`:
//   p     — paragraph (string, may carry `code:true` spans via `c` blocks)
//   list  — bulleted list of strings
//   steps — ordered list of { h, p }
//   code  — { caption?, lines: string[] }
//   table — { head: string[], rows: string[][] }
//   dl    — [term, definition][]
//   note  — { tone: 'info' | 'warn', text }

import { RWAID_ADDRESS, USDC_ADDRESS } from './contracts'

export const DOCS_VERSION = 'v3'
export const DOCS_UPDATED = '2 August 2026'

export const RESOLVER_ADDRESS = '0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1'
export const SAFE_ADDRESS     = '0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab'
export const V2_ADDRESS       = '0xD0B565C7134bDB16Fc3b8A9Cb5fdA003C37930c2'
export const GATEWAY_ORIGIN   = 'https://gateway.rwa-id.com'

export const DOCS_SECTIONS = [
  /* ────────────────────────────────────────────────────────────────────── */
  {
    id: 'overview',
    title: 'Overview',
    lede:
      'RWA-ID is an ENS-native identity registry on Ethereum mainnet. A platform registers a namespace, ' +
      'allowlists its clients, and each client claims a name that resolves to their wallet on every major chain.',
    blocks: [
      {
        t: 'p',
        text:
          'An identity is a real ENS name — alice.yourfirm.rwa-id.eth — backed by an ERC-721 token in the ' +
          'registry contract. Wallets resolve it with no SDK and no integration on your side, because it ' +
          'travels the standard ENS path. Nothing about the design requires you to run a server, hold client ' +
          'funds, or expose your KYC systems.',
      },
      {
        t: 'list',
        items: [
          'Non-custodial — the registry never holds your treasury, your keys or your clients’ assets.',
          'No backend, no indexer — this console reads Ethereum directly from your browser.',
          'Soulbound by default — an identity is bound to the wallet that claimed it, and you can revoke it.',
          'Fees settle in USDC at claim time, split 70% to your treasury and 30% to the protocol.',
        ],
      },
      {
        t: 'p',
        text:
          'These docs describe RWA-ID v3, the registry that has been live on Ethereum mainnet since ' +
          '1 August 2026. If you integrated against v2, read “What changed in v3” — the ENS layout, the ' +
          'Merkle leaf format and every allowlist you already published are unchanged.',
      },
      {
        t: 'table',
        head: ['Contract', 'Address', 'Role'],
        rows: [
          ['RWAIDv3', RWAID_ADDRESS, 'Registry, identity NFTs, fee splitting'],
          ['Wildcard resolver', RESOLVER_ADDRESS, 'ENSIP-10 + CCIP-Read resolution'],
          ['Protocol Safe', SAFE_ADDRESS, 'Contract owner and protocol treasury'],
          ['USDC', USDC_ADDRESS, 'Claim fee denomination'],
          ['RWAIDv2 (superseded)', V2_ADDRESS, 'Read-only history; no token metadata'],
        ],
      },
    ],
  },

  /* ────────────────────────────────────────────────────────────────────── */
  {
    id: 'resolution',
    title: 'How a name resolves',
    lede:
      'Three standards do the work: ENSIP-10 wildcard resolution, EIP-3668 CCIP-Read, and Chainlink CCIP for ' +
      'chains other than Ethereum.',
    blocks: [
      {
        t: 'steps',
        items: [
          {
            h: 'ENS finds the resolver',
            p:
              'rwa-id.eth points at one wildcard resolver. Under ENSIP-10 that resolver answers for every ' +
              'name beneath it, so alice.yourfirm.rwa-id.eth resolves without ever being registered as an ' +
              'ENS name. Issuing a client costs no registration fee.',
          },
          {
            h: 'The resolver defers offchain',
            p:
              'The resolver reverts with OffchainLookup (EIP-3668). The wallet follows the revert to the ' +
              'RWA-ID gateway, which reads the registry and signs its answer.',
          },
          {
            h: 'The contract verifies the answer',
            p:
              'The signed response goes back to resolveWithProof, which checks it against the resolver’s ' +
              'trusted signer before returning an address. Data is cheap to serve; trust stays onchain.',
          },
          {
            h: 'Other chains ask Ethereum',
            p:
              'From Base, Arbitrum, Optimism or Polygon, a CCIP wildcard resolver carries the request to ' +
              'Ethereum via Chainlink CCIP and returns the verified answer, so one name resolves everywhere.',
          },
        ],
      },
      {
        t: 'code',
        caption: 'Node derivation — hash-only, so the resolver never needs the label',
        lines: [
          'rootNode    = namehash("rwa-id.eth")',
          'projectNode = keccak256(rootNode ++ keccak256(slug))',
          'nameNode    = keccak256(projectNode ++ keccak256(label))',
        ],
      },
      {
        t: 'p',
        text:
          'The gateway serves ' + GATEWAY_ORIGIN + '/{sender}/{data}.json and calls resolveAddr(node) on the ' +
          'registry. Because resolveAddr returns ownerOf(tokenId), a transferable identity that changes hands ' +
          'starts resolving to its new owner with no further transaction.',
      },
      {
        t: 'note',
        tone: 'info',
        text:
          'The resolver stores no registry address — it only verifies the gateway’s signature. That is why the ' +
          'v2 → v3 cutover was a gateway configuration change and did not require redeploying the resolver or ' +
          'touching your ENS records.',
      },
    ],
  },

  /* ────────────────────────────────────────────────────────────────────── */
  {
    id: 'quickstart',
    title: 'Quickstart for platforms',
    lede: 'Four transactions from an empty wallet to your first issued identity. Everything happens in this console.',
    blocks: [
      {
        t: 'steps',
        items: [
          {
            h: 'Connect a wallet',
            p:
              'Connect the wallet that will own the project. It becomes the project owner — the only address ' +
              'that can change fees, publish allowlists or revoke identities. A Safe is the right choice here; ' +
              'ownership is transferable later with transferProjectOwnership.',
          },
          {
            h: 'Create your namespace',
            p:
              'Pick a permanent slug of 3–32 characters, set the treasury address that receives your share of ' +
              'claim fees, choose a claim fee, and decide whether identities are soulbound or transferable. ' +
              'Creating a project is free — you pay gas only.',
          },
          {
            h: 'Publish an allowlist',
            p:
              'Upload a CSV of label,address pairs. The console builds the Merkle tree in your browser, pins ' +
              'the proof set to IPFS, and writes only the root onchain with updateMerkleRoot.',
          },
          {
            h: 'Share the claim link',
            p:
              'The claim link carries your project id and the proof-set CID. Your client connects, approves ' +
              'USDC, and claims. The fee splits to your treasury and the protocol treasury in the same ' +
              'transaction that mints their identity.',
          },
        ],
      },
      {
        t: 'note',
        tone: 'warn',
        text:
          'The proof set you pin to IPFS is public and permanent — it contains every label and address on your ' +
          'allowlist. Use pseudonymous labels rather than clients’ legal names unless you have a lawful basis ' +
          'to publish them.',
      },
    ],
  },

  /* ────────────────────────────────────────────────────────────────────── */
  {
    id: 'namespaces',
    title: 'Namespaces and labels',
    blocks: [
      {
        t: 'dl',
        items: [
          ['Slug', '3–32 characters, a–z, 0–9 and interior hyphens. Uppercase is normalized down; the slug is permanent once the project exists.'],
          ['Label', '1–63 characters, lowercase a–z, 0–9, hyphen and underscore. Uppercase is rejected, not folded.'],
          ['Reservation', 'The protocol Safe can reserve a slug for a specific address for a fixed duration, so an incoming institution cannot be front-run. Reservations expire on their own.'],
        ],
      },
      {
        t: 'note',
        tone: 'warn',
        text:
          'Labels must be lowercase before they reach your CSV. The gateway lowercases a name before hashing ' +
          'it, so a v2 identity claimed as “Zac” minted successfully and then never resolved — the token lived ' +
          'at keccak("Zac") while ENS looked up keccak("zac"). v3 rejects the mixed-case claim outright, so the ' +
          'allowlist, the mint and ENS resolution agree by construction.',
      },
      {
        t: 'p',
        text:
          'Restricting labels to that character set also keeps the onchain renderer safe: tokenURI interpolates ' +
          'the label into JSON and SVG, so quotes and angle brackets are never accepted in the first place.',
      },
    ],
  },

  /* ────────────────────────────────────────────────────────────────────── */
  {
    id: 'allowlists',
    title: 'Allowlists and Merkle proofs',
    lede: 'Your client list stays off the chain. Only a 32-byte root and an IPFS pointer are ever published by you.',
    blocks: [
      {
        t: 'code',
        caption: 'Leaf format — unchanged since v2, so existing roots and proofs stay valid',
        lines: ['leaf = keccak256(abi.encodePacked(claimer, keccak256(bytes(label))))'],
      },
      {
        t: 'code',
        caption: 'clients.csv',
        lines: [
          'alice,0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          'bob,0x8a3e2F95A120C3d0B35F46aC77B2F9A5C028dE81',
          'carol,0x9f2cB8E4A5D3F6C7A8B9E0D1C2F3A4B5C6D7E8F9',
        ],
      },
      {
        t: 'list',
        items: [
          'The tree is built in your browser — no client list is uploaded to any RWA-ID server.',
          'Publishing a new root replaces the old one. Identities already claimed are unaffected.',
          'To add clients, rebuild the tree from the full list and publish the new root; old proofs stop verifying.',
          'The console keeps the CID and entry count in localStorage so it can rebuild your claim link; clearing site data removes only that pointer, not the pinned proof set.',
        ],
      },
    ],
  },

  /* ────────────────────────────────────────────────────────────────────── */
  {
    id: 'claiming',
    title: 'Claiming an identity',
    blocks: [
      {
        t: 'code',
        caption: 'The claim call your client’s wallet makes',
        lines: [
          '// 1 — approve the fee',
          'usdc.approve(RWAID_ADDRESS, claimFee)',
          '',
          '// 2 — claim; the label is passed in full so the token can name itself',
          'rwaid.claim(projectId, "alice", merkleProof)',
        ],
      },
      {
        t: 'p',
        text:
          'The contract verifies the proof against the project’s current root, checks that the name has not ' +
          'been claimed or revoked, mints the identity NFT, records the ENS node, and transfers the fee — all ' +
          'in one transaction. A wallet may hold one identity per project.',
      },
      {
        t: 'dl',
        items: [
          ['Fee', 'Set per project, in USDC. Leave it at zero to charge the protocol minimum of $0.50. Change it whenever you like with updateClaimFee.'],
          ['Split', '70% to your project treasury, 30% to the protocol treasury, transferred directly — the contract never escrows.'],
          ['Failure modes', '“Invalid proof” means the label or address does not match the published root; “Already claimed” means that wallet holds an identity in this project; “Name revoked” means the label is permanently retired.'],
        ],
      },
    ],
  },

  /* ────────────────────────────────────────────────────────────────────── */
  {
    id: 'identities',
    title: 'Identity tokens',
    lede: 'Every identity is an ERC-721 token whose artwork and metadata are generated onchain by the registry itself.',
    blocks: [
      {
        t: 'p',
        text:
          'v3 renders name, description, image and traits from contract storage, so a token reads as ' +
          '“alice.acme.rwa-id.eth” with artwork in any marketplace and depends on no metadata server. The ' +
          'protocol Safe can point baseURI at an offchain collection later; clearing it restores the onchain art.',
      },
      {
        t: 'dl',
        items: [
          ['Soulbound', 'The project default. Transfers revert, so the identity stays bound to the wallet that passed your KYC.'],
          ['Transferable', 'Set per project, or overridden per token with setTokenTransferable. Because resolveAddr returns the current owner, ENS follows the transfer automatically.'],
          ['Revocation', 'revokeIdentity burns the token, clears the ENS node so the gateway answers address(0), and retires that label permanently within the project.'],
          ['Pausing', 'pauseProject stops new claims without touching identities already issued.'],
        ],
      },
    ],
  },

  /* ────────────────────────────────────────────────────────────────────── */
  {
    id: 'reading',
    title: 'Reading identities from your systems',
    lede: 'Verification is a public contract call. No API keys, no webhooks, no vendor in your critical path.',
    blocks: [
      {
        t: 'code',
        caption: 'Resolve a name the ordinary ENS way (viem)',
        lines: [
          "import { createPublicClient, http } from 'viem'",
          "import { mainnet } from 'viem/chains'",
          '',
          'const client = createPublicClient({',
          '  chain: mainnet,',
          '  transport: http(),',
          '})',
          '',
          'const holder = await client.getEnsAddress({',
          "  name: 'alice.yourfirm.rwa-id.eth',",
          '}) // → 0x742d…0bEb',
        ],
      },
      {
        t: 'p',
        text:
          'viem and ethers both follow the OffchainLookup revert on their own, so no RWA-ID-specific code is ' +
          'needed. If you would rather read the registry directly — to inspect the token behind a name, for ' +
          'example — the view functions below are all public.',
      },
      {
        t: 'code',
        caption: 'Registry reads',
        lines: [
          'projectNode(projectId)               → bytes32',
          'nameNodeFromHash(projectId, hash)    → bytes32',
          'resolveAddr(node)                    → address (0 if unclaimed or revoked)',
          'nodeToTokenId(node)                  → uint256',
          'fullName(tokenId)                    → "alice.acme.rwa-id.eth"',
          'projects(projectId)                  → owner, slug, treasury, fee, root, totals',
        ],
      },
    ],
  },

  /* ────────────────────────────────────────────────────────────────────── */
  {
    id: 'v3',
    title: 'What changed in v3',
    lede: 'v3 is a metadata and safety upgrade. The ENS layout and every allowlist built for v2 carry over untouched.',
    blocks: [
      {
        t: 'list',
        items: [
          'Onchain token metadata. v2 never overrode tokenURI, so identities rendered on marketplaces as an untitled, imageless “RWA ID #n”. v3 stores the label and renders name, description, image and traits from the contract.',
          'claim takes the label itself rather than its hash, so the contract can name what it mints. The Merkle leaf is unchanged, so roots and proofs built for v2 still verify.',
          'Labels are validated at the door — lowercase only — which closes the mixed-case resolution trap described above.',
          'Optional baseURI and contractURI escape hatches, so artwork and collection details can be repointed without redeploying.',
        ],
      },
      {
        t: 'p',
        text:
          'The wildcard resolver was not redeployed: it holds no registry address, and the cutover was a ' +
          'gateway configuration change. v2 remains readable at ' + V2_ADDRESS + ', but new projects and ' +
          'claims should target v3.',
      },
    ],
  },

  /* ────────────────────────────────────────────────────────────────────── */
  {
    id: 'security',
    title: 'Security and governance',
    blocks: [
      {
        t: 'dl',
        items: [
          ['Protocol owner', `A Safe multisig at ${SAFE_ADDRESS} owns the registry and receives the protocol share. It can reserve namespaces, adjust the protocol fee within its 10–50% bounds, and set the protocol treasury.`],
          ['What the protocol cannot do', 'It cannot mint, transfer or revoke your clients’ identities, cannot move your treasury’s funds, and cannot change your project’s fee or allowlist.'],
          ['What you control', 'Your project’s fee, treasury, allowlist root, transferability, pause state, revocations and ownership — each a signed transaction from the project owner.'],
          ['Audit status', 'Internal review complete; the contracts are verified on Etherscan and the test suite covers the registry and v3’s own surface. No third-party audit has been published yet.'],
        ],
      },
      {
        t: 'note',
        tone: 'info',
        text:
          'Every issuance, fee change and revocation is a public event. Anyone — your auditor, your regulator, ' +
          'your counterparty — can reconstruct the full history from the chain without asking you for it.',
      },
    ],
  },

  /* ────────────────────────────────────────────────────────────────────── */
  {
    id: 'support',
    title: 'Support',
    blocks: [
      {
        t: 'p',
        text:
          'The whitepaper covers the protocol design and economics in depth, and the contracts, tests and ' +
          'deployment scripts are public on GitHub. For an integration walkthrough or a reserved namespace, ' +
          'reach out and we will get on a call.',
      },
    ],
  },
]
