// RWAIDv4.1 on Robinhood Chain (4663). Deployed 2026-10-13, block 87872447, from
// commit 54e27c3 (v4.0 at 0xb99c… was superseded before any project existed). Source of truth for addresses:
// protocol/deployments/robinhood.json.
//
// The ABI below is the subset this app calls, taken from the compiled artifact.
// protocol/scripts/check-dashboard-abi.mjs (CONTRACT=RWAIDv4) fails if any entry
// drifts from the contract.
export const RWAID_ADDRESS = '0x85B09167aB330641f8e5F73E2e904C75FDFa8132'
export const DEPLOY_BLOCK  = 87_872_447n

// USDG (Paxos, 6 decimals): the registry's paymentToken. Robinhood Chain's
// dollar; bridged USDC arrives as USDG.
export const USDG_ADDRESS  = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168'

export const ERC20_ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
]

export const RWAID_ABI = [
  { name: 'claim', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'label', type: 'string' }, { name: 'proof', type: 'bytes32[]' }], outputs: [] },
  { name: 'claimFor', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'claimer', type: 'address' }, { name: 'label', type: 'string' }, { name: 'proof', type: 'bytes32[]' }], outputs: [] },
  { name: 'claimed', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }, { name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'createProject', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'slug', type: 'string' }, { name: 'treasury_', type: 'address' }, { name: 'claimFee_', type: 'uint256' }, { name: 'transferable_', type: 'bool' }], outputs: [{ name: 'projectId', type: 'uint256' }] },
  { name: 'effectiveClaimFee', type: 'function', stateMutability: 'view', inputs: [{ name: 'projectId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'fullName', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] },
  { name: 'fundSponsorship', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'minimumClaimFee', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'nameNodeFromHash', type: 'function', stateMutability: 'view', inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'nameHash_', type: 'bytes32' }], outputs: [{ name: '', type: 'bytes32' }] },
  { name: 'nextProjectId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'nodeClaimed', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'bytes32' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'nodeToTokenId', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'ownerOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { name: 'pauseProject', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'projectId', type: 'uint256' }], outputs: [] },
  { name: 'paymentToken', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'projectIdBySlugHash', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'projectImage', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] },
  { name: 'projectUsage', type: 'function', stateMutability: 'view', inputs: [{ name: 'projectId', type: 'uint256' }], outputs: [{ name: 'owner', type: 'address' }, { name: 'totalClaimed', type: 'uint256' }, { name: 'protocolFees', type: 'uint256' }] },
  { name: 'projects', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: 'owner', type: 'address' }, { name: 'slug', type: 'string' }, { name: 'slugHash', type: 'bytes32' }, { name: 'treasury', type: 'address' }, { name: 'claimFee', type: 'uint256' }, { name: 'transferable', type: 'bool' }, { name: 'merkleRoot', type: 'bytes32' }, { name: 'active', type: 'bool' }, { name: 'totalClaimed', type: 'uint256' }, { name: 'totalRevenue', type: 'uint256' }] },
  { name: 'protocolFeePercent', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'protocolFeesPaid', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'reservationExpiry', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'reservedTo', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'bytes32' }], outputs: [{ name: '', type: 'address' }] },
  { name: 'revokeIdentity', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
  { name: 'revoked', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }, { name: '', type: 'bytes32' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'setProjectImage', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'uri', type: 'string' }], outputs: [] },
  { name: 'setProjectTransferable', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'transferable_', type: 'bool' }], outputs: [] },
  { name: 'setTokenTransferable', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'transferable_', type: 'bool' }], outputs: [] },
  { name: 'sponsorBalance', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'tokenMetadata', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: 'projectId', type: 'uint256' }, { name: 'nameHash', type: 'bytes32' }, { name: 'claimedAt', type: 'uint256' }, { name: 'label', type: 'string' }] },
  { name: 'tokenTransferable', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'tokenURI', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] },
  { name: 'transferProjectOwnership', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'newOwner', type: 'address' }], outputs: [] },
  { name: 'unpauseProject', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'projectId', type: 'uint256' }], outputs: [] },
  { name: 'updateClaimFee', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'newFee', type: 'uint256' }], outputs: [] },
  { name: 'updateMerkleRoot', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'newRoot', type: 'bytes32' }, { name: 'newTotalAllowlisted', type: 'uint256' }], outputs: [] },
  { name: 'updateTreasury', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'newTreasury', type: 'address' }], outputs: [] },
  { name: 'withdrawSponsorship', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'projectId', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'to', type: 'address' }], outputs: [] },
  { name: 'ClaimPaid', type: 'event', anonymous: false, inputs: [{ name: 'projectId', type: 'uint256', indexed: true}, { name: 'tokenId', type: 'uint256', indexed: true}, { name: 'payer', type: 'address', indexed: true}, { name: 'sponsored', type: 'bool', indexed: false }] },
  { name: 'IdentityClaimed', type: 'event', anonymous: false, inputs: [{ name: 'projectId', type: 'uint256', indexed: true}, { name: 'nameHash', type: 'bytes32', indexed: true}, { name: 'claimer', type: 'address', indexed: true}, { name: 'tokenId', type: 'uint256', indexed: false}, { name: 'node', type: 'bytes32', indexed: false}, { name: 'feePaid', type: 'uint256', indexed: false}, { name: 'label', type: 'string', indexed: false }] },
  { name: 'IdentityRevoked', type: 'event', anonymous: false, inputs: [{ name: 'projectId', type: 'uint256', indexed: true}, { name: 'nameHash', type: 'bytes32', indexed: false}, { name: 'tokenId', type: 'uint256', indexed: false }] },
  { name: 'MerkleRootUpdated', type: 'event', anonymous: false, inputs: [{ name: 'projectId', type: 'uint256', indexed: true}, { name: 'newRoot', type: 'bytes32', indexed: false}, { name: 'totalAllowlisted', type: 'uint256', indexed: false }] },
  { name: 'ProjectImageUpdated', type: 'event', anonymous: false, inputs: [{ name: 'projectId', type: 'uint256', indexed: true}, { name: 'uri', type: 'string', indexed: false }] },
  { name: 'SponsorshipFunded', type: 'event', anonymous: false, inputs: [{ name: 'projectId', type: 'uint256', indexed: true}, { name: 'funder', type: 'address', indexed: true}, { name: 'amount', type: 'uint256', indexed: false }] },
  { name: 'SponsorshipWithdrawn', type: 'event', anonymous: false, inputs: [{ name: 'projectId', type: 'uint256', indexed: true}, { name: 'to', type: 'address', indexed: true}, { name: 'amount', type: 'uint256', indexed: false }] },
]

const event = (name) => RWAID_ABI.find(x => x.type === 'event' && x.name === name)
export const IDENTITY_CLAIMED    = event('IdentityClaimed')
export const MERKLE_ROOT_UPDATED = event('MerkleRootUpdated')
export const CLAIM_PAID          = event('ClaimPaid')
export const IDENTITY_REVOKED    = event('IdentityRevoked')
export const SPONSORSHIP_FUNDED  = event('SponsorshipFunded')
export const SPONSORSHIP_WITHDRAWN = event('SponsorshipWithdrawn')
