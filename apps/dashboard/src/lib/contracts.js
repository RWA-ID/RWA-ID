// RWAIDv3 — deployed 2026-08-01 at block 25661280, owner is the protocol Safe.
// v2 (superseded, metadata-less): 0xD0B565C7134bDB16Fc3b8A9Cb5fdA003C37930c2
export const RWAID_ADDRESS = '0x6413e9E6A0D4e05557463A66C34E18192324A2C7'
export const USDC_ADDRESS  = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

export const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
]

export const RWAID_ABI = [
  // ── View ────────────────────────────────────────────────────────────────
  {
    name: 'nextProjectId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'projects',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'slug', type: 'string' },
      { name: 'slugHash', type: 'bytes32' },
      { name: 'treasury', type: 'address' },
      { name: 'claimFee', type: 'uint256' },
      { name: 'transferable', type: 'bool' },
      { name: 'merkleRoot', type: 'bytes32' },
      { name: 'active', type: 'bool' },
      { name: 'totalClaimed', type: 'uint256' },
      { name: 'totalRevenue', type: 'uint256' },
    ],
  },
  {
    name: 'tokenMetadata',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'nameHash', type: 'bytes32' },
      { name: 'claimedAt', type: 'uint256' },
      { name: 'label', type: 'string' },
    ],
  },
  {
    // Onchain-rendered metadata — v2 had no tokenURI at all, which is why
    // identities showed on marketplaces as untitled, imageless "RWA ID #n".
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'fullName',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'minimumClaimFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    // The protocol's cut of every claim fee. Owner-settable, so the console
    // reads it rather than assuming the 30 it launched with.
    name: 'protocolFeePercent',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'nameNodeFromHash',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'nameHash_', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'nodeToTokenId',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'nodeClaimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'revoked',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'nameHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  // ── Claim ────────────────────────────────────────────────────────────────
  {
    // v3 takes the label itself and derives the hash onchain, so the minted
    // token can be named. The Merkle leaf is unchanged, so proof sets built
    // for v2 still verify.
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'label', type: 'string' },
      { name: 'proof', type: 'bytes32[]' },
    ],
    outputs: [],
  },
  {
    name: 'claimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'claimer', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  // ── Project Creation ─────────────────────────────────────────────────────
  {
    name: 'createProject',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'slug', type: 'string' },
      { name: 'treasury', type: 'address' },
      { name: 'claimFee', type: 'uint256' },
      { name: 'transferable', type: 'bool' },
    ],
    outputs: [{ name: 'projectId', type: 'uint256' }],
  },
  // ── Project Owner Actions ────────────────────────────────────────────────
  {
    name: 'updateMerkleRoot',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'newRoot', type: 'bytes32' },
      { name: 'newTotalAllowlisted', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'updateClaimFee',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'newFee', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'updateTreasury',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'newTreasury', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'setProjectTransferable',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'transferable_', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'setTokenTransferable',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'transferable_', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'pauseProject',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'unpauseProject',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'transferProjectOwnership',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'newOwner', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'revokeIdentity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
  // ── Events ────────────────────────────────────────────────────────────────
  {
    name: 'MerkleRootUpdated',
    type: 'event',
    inputs: [
      { name: 'projectId',        type: 'uint256', indexed: true },
      { name: 'newRoot',          type: 'bytes32', indexed: false },
      { name: 'totalAllowlisted', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'ProjectCreated',
    type: 'event',
    inputs: [
      { name: 'projectId', type: 'uint256', indexed: true },
      { name: 'slug', type: 'string', indexed: false },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'treasury', type: 'address', indexed: false },
      { name: 'claimFee', type: 'uint256', indexed: false },
      { name: 'transferable', type: 'bool', indexed: false },
    ],
  },
  {
    name: 'IdentityClaimed',
    type: 'event',
    inputs: [
      { name: 'projectId', type: 'uint256', indexed: true },
      { name: 'nameHash', type: 'bytes32', indexed: true },
      { name: 'claimer', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: false },
      { name: 'node', type: 'bytes32', indexed: false },
      { name: 'feePaid', type: 'uint256', indexed: false },
      { name: 'label', type: 'string', indexed: false },
    ],
  },
]
