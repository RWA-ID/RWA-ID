// Technical documentation, rendered in-app by DocsPage. Content only — the
// renderer owns all markup.
//
// Blocks are discriminated by `t`:
//   p     — paragraph
//   list  — bulleted list of strings
//   steps — ordered list of { h, p }
//   code  — { caption?, lines: string[] }
//   table — { head: string[], rows: string[][] }  (a 0x address in column 2 links to its explorer)
//   dl    — [term, definition][]
//   note  — { tone: 'info' | 'warn', text }

import { RWAID_ADDRESS, USDG_ADDRESS } from './contracts'

export const DOCS_VERSION = 'v4.1'
export const DOCS_UPDATED = '13 October 2026'

export const RESOLVER_ADDRESS = '0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1'
export const SAFE_ADDRESS     = '0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab'
export const SIGNER_ADDRESS   = '0xC9fACcf3a77b553375017efFEe441D9770fAA723'
export const V3_ADDRESS       = '0x6413e9E6A0D4e05557463A66C34E18192324A2C7'
export const GATEWAY_ORIGIN   = 'https://gateway.rwa-id.com'

export const DOCS_SECTIONS = [
  {
    id: 'overview',
    title: 'Overview',
    lede:
      'RWA ID gives the client wallets of tokenized-asset platforms readable ENS names. A platform registers a ' +
      'namespace, allowlists its clients, and each client wallet gets a name like joe.yourplatform.rwa-id.eth.',
    blocks: [
      {
        t: 'p',
        text:
          'Every name is a real ENS name backed by an ERC-721 token in the registry, which lives on Robinhood ' +
          'Chain. Wallets resolve it through the standard ENS path on Ethereum, with no SDK and no integration on ' +
          'your side. Nothing in the design requires you to run a server, hold client funds, or expose your KYC systems.',
      },
      {
        t: 'list',
        items: [
          'Non-custodial: the registry never holds your treasury, your keys or your clients’ assets.',
          'No backend, no indexer: this console reads Robinhood Chain directly from your browser.',
          'Fees in USDG at claim time, split 70% to your treasury and 30% to the protocol, or sponsored by you so clients pay nothing.',
          'Names follow the ENS normalization rules (ENSIP-15), so every name the registry accepts resolves in a wallet.',
        ],
      },
    ],
  },
  {
    id: 'contracts',
    title: 'Contracts',
    blocks: [
      {
        t: 'table',
        head: ['Contract', 'Address', 'Where · role'],
        rows: [
          ['RWAIDv4.1', RWAID_ADDRESS, 'Robinhood Chain · registry, identity NFTs, fees, sponsor pools'],
          ['USDG', USDG_ADDRESS, 'Robinhood Chain · claim fee token (Paxos, 6 decimals)'],
          ['Protocol Safe', SAFE_ADDRESS, 'Both chains · registry owner and protocol treasury (2-of-3)'],
          ['Wildcard resolver', RESOLVER_ADDRESS, 'Ethereum · resolver for rwa-id.eth (ENSIP-10 + CCIP-Read)'],
          ['Gateway signer', SIGNER_ADDRESS, 'The key the resolver trusts for gateway answers'],
          ['RWAIDv3 (legacy)', V3_ADDRESS, 'Ethereum · the 2026-08 registry; its names still resolve'],
        ],
      },
      {
        t: 'note',
        tone: 'info',
        text:
          'All addresses are also in protocol/deployments/robinhood.json in the repository. The registry source is ' +
          'verified on Blockscout.',
      },
    ],
  },
  {
    id: 'resolution',
    title: 'How a name resolves',
    lede: 'ENSIP-10 wildcard resolution and EIP-3668 CCIP-Read bridge the registry on Robinhood Chain to ENS on Ethereum.',
    blocks: [
      {
        t: 'steps',
        items: [
          { h: 'ENS finds the resolver', p: 'rwa-id.eth points at one wildcard resolver on Ethereum. Under ENSIP-10 it answers for every name beneath it, so joe.acme.rwa-id.eth resolves without ever being registered as an ENS name.' },
          { h: 'The resolver defers off-chain', p: 'The resolver reverts with OffchainLookup (EIP-3668). The wallet follows it to the RWA ID gateway, which reads the registry on Robinhood Chain and signs its answer.' },
          { h: 'Ethereum verifies the answer', p: 'The signed response goes back to resolveWithProof on Ethereum, which checks it against the resolver’s trusted signer before returning an address.' },
        ],
      },
      {
        t: 'code',
        caption: 'Node derivation: hash-only, so the resolver never needs the label',
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
          'registry. It checks the v4.1 registry on Robinhood Chain first, and the legacy v3 registry on Ethereum ' +
          'only when v4.1 has no project for the slug. resolveAddr returns the current token holder, so a ' +
          'transferable name that changes hands resolves to its new owner with no further transaction.',
      },
      {
        t: 'note',
        tone: 'info',
        text:
          'Today the resolver answers addr() for Ethereum addresses. Per-chain addresses (Bitcoin, Solana and ' +
          'other EVM chains) need a new resolver and are on the roadmap.',
      },
    ],
  },
  {
    id: 'quickstart',
    title: 'Quickstart for platforms',
    lede: 'From an empty wallet to your first issued name. Everything happens in the console, on Robinhood Chain.',
    blocks: [
      {
        t: 'steps',
        items: [
          { h: 'Connect a wallet', p: 'The wallet you connect becomes the project owner, the only address that can change fees, publish allowlists or revoke names. A Safe is the right choice for anything long-lived; ownership is transferable later. You need a little ETH on Robinhood Chain for gas.' },
          { h: 'Create your namespace', p: 'Pick a permanent slug, set the treasury that receives your share, choose a claim fee and whether names are soulbound or transferable. Creating a project is free; you pay gas only, a fraction of a cent.' },
          { h: 'Publish an allowlist', p: 'Upload a CSV of name,wallet pairs. The console builds the Merkle tree in your browser, pins the proof set to IPFS, and writes only the root on-chain with updateMerkleRoot.' },
          { h: 'Decide who pays', p: 'Leave clients to pay the claim fee in USDG, or fund a sponsor pool so they claim free. Sponsored claims still route your 70% share to your treasury, so each one costs you only the protocol’s 30%.' },
          { h: 'Share the link, or deliver', p: 'Send clients the claim link, or deliver names straight to their wallets with claimFor from the Sponsorship screen. Delivered names still go only to the wallet each name was allowlisted for.' },
        ],
      },
      {
        t: 'note',
        tone: 'warn',
        text:
          'The proof set you pin to IPFS is public and permanent: it contains every name and wallet on your ' +
          'allowlist. Use pseudonymous names rather than clients’ legal names unless you have a lawful basis to publish them.',
      },
    ],
  },
  {
    id: 'namespaces',
    title: 'Namespaces and labels',
    blocks: [
      {
        t: 'dl',
        items: [
          ['Slug', '3–32 characters: a–z, 0–9 and interior hyphens, with no “--” in the third and fourth positions. Uppercase is folded down. The slug is permanent once the project exists.'],
          ['Label', '1–63 characters: lowercase a–z, 0–9 and hyphens. Underscores only as a leading run, and no “--” in positions three and four. These are the ENSIP-15 rules wallets enforce; anything else is rejected at claim time.'],
          ['Reservation', 'The protocol Safe can reserve a slug for a specific address for a fixed time, so an incoming platform cannot be front-run. 36 slugs are reserved at launch, until 12 October 2029.'],
        ],
      },
      {
        t: 'note',
        tone: 'warn',
        text:
          'Labels must be lowercase. The gateway lowercases a name before hashing it, so a name allowlisted as ' +
          '“Zac” would hash to a different node than the “zac” ENS asks for. The console lowercases names for ' +
          'you, and the registry rejects anything else.',
      },
    ],
  },
  {
    id: 'allowlists',
    title: 'Allowlists and Merkle proofs',
    lede: 'Your client list stays off the chain. Only a 32-byte root is published on-chain, and the proofs live on IPFS.',
    blocks: [
      { t: 'code', caption: 'Leaf format (unchanged since v2)', lines: ['leaf = keccak256(abi.encodePacked(wallet, keccak256(bytes(label))))'] },
      { t: 'code', caption: 'clients.csv', lines: ['name,wallet', 'joe,0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 'ana,0x8a3e2F95A120C3d0B35F46aC77B2F9A5C028dE81', 'treasury,0x9f2cB8E4A5D3F6C7A8B9E0D1C2F3A4B5C6D7E8F9'] },
      {
        t: 'list',
        items: [
          'The tree is built in your browser; no client list is uploaded to any RWA ID server.',
          'Publishing a new root replaces the old one. Names already claimed are unaffected.',
          'To add clients, load the live proof set, append, and publish the new root.',
          'A claim link names its registry (v=4), and the claim page checks that its proof set matches the live root, so an out-of-date link fails clearly instead of reverting.',
        ],
      },
    ],
  },
  {
    id: 'claiming',
    title: 'Claiming and sponsorship',
    blocks: [
      {
        t: 'code',
        caption: 'The two ways a name is minted',
        lines: [
          '// The client claims (approve first unless the claim is sponsored)',
          'usdg.approve(REGISTRY, effectiveClaimFee(projectId))',
          'registry.claim(projectId, "joe", proof)',
          '',
          '// Or anyone delivers it to the allowlisted wallet',
          'registry.claimFor(projectId, wallet, "joe", proof)',
        ],
      },
      {
        t: 'p',
        text:
          'The contract verifies the proof against the project’s current root, checks the name has not been ' +
          'claimed or revoked, mints the identity NFT to the allowlisted wallet, and collects the fee, all in one ' +
          'transaction. A wallet may hold one name per project.',
      },
      {
        t: 'dl',
        items: [
          ['Fee', 'Set per project in USDG. The contract charges max(your fee, 0.50 USDG). Change it any time with updateClaimFee; effectiveClaimFee(projectId) returns what a claim costs now.'],
          ['Sponsor pool', 'fundSponsorship(projectId, amount) moves USDG into the project’s pool; anyone can fund it, only the project owner can withdraw. If the pool holds at least one full fee, the pool pays and the claimer pays nothing; otherwise whoever sends the transaction pays.'],
          ['Split', '70% to your treasury and 30% to the protocol treasury, transferred directly. The contract never escrows fees; only sponsor pools are held.'],
          ['Failure modes', '“Invalid proof”: the name or wallet does not match the published root. “Already claimed”: that wallet holds a name in this project. “Name revoked”: the name is permanently retired. “Project paused”: claiming is off.'],
        ],
      },
    ],
  },
  {
    id: 'identities',
    title: 'Identity tokens and artwork',
    lede: 'Every name is an ERC-721 token whose metadata is generated on-chain by the registry.',
    blocks: [
      {
        t: 'p',
        text:
          'tokenURI returns the name, description, traits and image straight from contract storage, so a token ' +
          'reads as “joe.acme.rwa-id.eth” in any marketplace with no metadata server. The default image is the ' +
          'RWA ID identity card, drawn on-chain as SVG. A platform can replace it for its whole namespace with ' +
          'setProjectImage (an ipfs://, https:// or ar:// link); the contract then tells marketplaces to refresh.',
      },
      {
        t: 'dl',
        items: [
          ['Soulbound', 'Transfers revert, so the name stays with the wallet you allowlisted. The usual choice for client identities.'],
          ['Transferable', 'Set per project, or per token with setTokenTransferable. Because resolveAddr returns the current holder, ENS follows a transfer automatically.'],
          ['Revocation', 'revokeIdentity burns the token, clears resolution and retires that name within the project permanently.'],
          ['Pausing', 'pauseProject stops new claims and deliveries without touching names already issued.'],
        ],
      },
    ],
  },
  {
    id: 'reading',
    title: 'Reading identities from your systems',
    lede: 'Verification is a public contract call. No API keys, no webhooks, no vendor in your critical path.',
    blocks: [
      {
        t: 'code',
        caption: 'Resolve a name the ordinary ENS way (viem, against Ethereum)',
        lines: [
          "import { createPublicClient, http } from 'viem'",
          "import { mainnet } from 'viem/chains'",
          '',
          'const client = createPublicClient({ chain: mainnet, transport: http() })',
          "const wallet = await client.getEnsAddress({ name: 'joe.acme.rwa-id.eth' })",
        ],
      },
      {
        t: 'p',
        text:
          'viem and ethers follow the OffchainLookup revert on their own. To gate access on-chain, or to inspect ' +
          'the token behind a name, read the registry on Robinhood Chain directly:',
      },
      {
        t: 'code',
        caption: 'Registry reads (Robinhood Chain)',
        lines: [
          'projectIdBySlugHash(keccak256(slug))  → projectId',
          'nameNodeFromHash(projectId, hash)     → node',
          'resolveAddr(node)                     → holder (0 if unclaimed or revoked)',
          'claimed(projectId, wallet)            → bool',
          'revoked(projectId, nameHash)          → bool',
          'fullName(tokenId)                     → "joe.acme.rwa-id.eth"',
          'projectUsage(projectId)               → owner, totalClaimed, protocolFees',
        ],
      },
    ],
  },
  {
    id: 'v4',
    title: 'What changed in v4',
    lede: 'v4 moves the registry to Robinhood Chain. The ENS layout and the Merkle leaf format are unchanged.',
    blocks: [
      {
        t: 'list',
        items: [
          'The registry lives on Robinhood Chain, so claims and admin cost a fraction of a cent. rwa-id.eth, its resolver and the gateway signer stay on Ethereum.',
          'Fees are in USDG, and the 0.50 minimum is a real floor: v3 charged any non-zero fee as set.',
          'Sponsor pools and claimFor: platforms can pay for their clients and deliver names directly.',
          'Labels and slugs follow ENSIP-15. v3 accepted names like “a_b” and “ab--cd” that minted but never resolved.',
          'Platforms can set their own NFT artwork; v4.1 adds the relaunch identity card as the on-chain default.',
          'Ownable2Step ownership, and projectUsage for usage-based integrations.',
        ],
      },
      {
        t: 'p',
        text:
          'v3 on Ethereum (' + V3_ADDRESS + ') is no longer used for new projects, but names issued under it ' +
          'keep resolving through the same gateway.',
      },
    ],
  },
  {
    id: 'governance',
    title: 'Security and governance',
    blocks: [
      {
        t: 'dl',
        items: [
          ['Protocol owner', `A 2-of-3 Safe at ${SAFE_ADDRESS} owns the registry and receives the protocol share. It can reserve namespaces, adjust the protocol fee within its 10–50% bounds, and set the protocol treasury.`],
          ['What the protocol cannot do', 'It cannot mint, transfer or revoke your clients’ names, cannot move your treasury’s funds or your sponsor pool, and cannot change your project’s fee or allowlist.'],
          ['What you control', 'Your project’s fee, treasury, allowlist, sponsor pool, artwork, transferability, pause state, revocations and ownership, each a signed transaction from the project owner.'],
          ['Audit status', 'The contracts are verified on Blockscout and covered by an extensive test suite, including fuzzing against the ENS normalizer. No third-party audit has been published yet.'],
        ],
      },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    blocks: [
      {
        t: 'p',
        text:
          'The whitepaper covers the design in depth, and the contracts, tests and deployment scripts are public ' +
          'on GitHub. For an integration walkthrough or a reserved namespace, email partner@rwa-id.com.',
      },
    ],
  },
]
