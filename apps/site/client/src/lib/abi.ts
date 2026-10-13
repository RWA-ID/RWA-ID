export const RWAID_V3_ADDRESS = "0x6413e9E6A0D4e05557463A66C34E18192324A2C7" as const;
/** @deprecated superseded by v3; kept so old imports fail loudly rather than silently. */
export const RWAID_V2_ADDRESS = RWAID_V3_ADDRESS;
export const USDC_ADDRESS     = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;

export const rwaIdV2Abi = [
  {
    name: "createProject",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "slug",        type: "string"  },
      { name: "treasury_",   type: "address" },
      { name: "claimFee_",   type: "uint256" },
      { name: "transferable_", type: "bool"  },
    ],
    outputs: [{ name: "projectId", type: "uint256" }],
  },
  {
    name: "updateMerkleRoot",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "projectId",          type: "uint256" },
      { name: "newRoot",            type: "bytes32" },
      { name: "newTotalAllowlisted", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "projectId", type: "uint256"   },
      { name: "nameHash_", type: "bytes32"   },
      { name: "proof",     type: "bytes32[]" },
    ],
    outputs: [],
  },
  {
    name: "projects",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [
      { name: "owner",        type: "address" },
      { name: "slug",         type: "string"  },
      { name: "slugHash",     type: "bytes32" },
      { name: "treasury",     type: "address" },
      { name: "claimFee",     type: "uint256" },
      { name: "transferable", type: "bool"    },
      { name: "merkleRoot",   type: "bytes32" },
      { name: "active",       type: "bool"    },
      { name: "totalClaimed", type: "uint256" },
      { name: "totalRevenue", type: "uint256" },
    ],
  },
  {
    name: "claimed",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "address",   type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "minimumClaimFee",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "projectIdBySlugHash",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "slugHash", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "reservedTo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "slugHash", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
  {
    name: "reservationExpiry",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "slugHash", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "ProjectCreated",
    type: "event",
    inputs: [
      { name: "projectId",   type: "uint256", indexed: true  },
      { name: "slug",        type: "string",  indexed: false },
      { name: "owner",       type: "address", indexed: true  },
      { name: "treasury",    type: "address", indexed: false },
      { name: "claimFee",    type: "uint256", indexed: false },
      { name: "transferable", type: "bool",   indexed: false },
    ],
  },
  {
    name: "IdentityClaimed",
    type: "event",
    inputs: [
      { name: "projectId", type: "uint256", indexed: true  },
      { name: "nameHash",  type: "bytes32", indexed: true  },
      { name: "claimer",   type: "address", indexed: true  },
      { name: "tokenId",   type: "uint256", indexed: false },
      { name: "node",      type: "bytes32", indexed: false },
      { name: "feePaid",   type: "uint256", indexed: false },
    ],
  },
] as const;

export const usdcAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs:  [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
] as const;

export const CHAIN_ID = 1;
