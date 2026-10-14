// Seeds a local Robinhood Chain fork with a realistic project for UI testing.
//
//   cd protocol && FORK_ROBINHOOD=1 npx hardhat node          # terminal 1
//   VITE_PINATA_JWT=… node apps/dashboard/scripts/seed-fork.mjs  # terminal 2
//
// Uses the live RWAIDv4.1 address on the fork. Creates "acme" owned by Hardhat
// account #1, publishes a three-wallet allowlist (pinned to IPFS, because the
// console reads proof sets from there), funds the sponsor pool with real USDG
// taken from a fork holder, and delivers joe's name. Prints the proof-set CID so
// it can be unpinned afterwards. Nothing is sent to the real chain.
import { createPublicClient, createTestClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { RWAID_ADDRESS, RWAID_ABI, USDG_ADDRESS } from '../src/lib/contracts.js'
import { buildMerkleTree } from '../src/lib/merkle.js'

const RPC = process.env.FORK_RPC || 'http://127.0.0.1:8545'
const JWT = process.env.VITE_PINATA_JWT
const USDG_HOLDER = '0x2D037f66b9e0EDE90c2080558a7d3FF7BE36E9A1'
const chain = { id: 4663, name: 'rh-fork', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [RPC] } } }

const platform = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d') // hardhat #1
const CLIENTS = [
  ['joe', '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'],
  ['ana', '0x90F79bf6EB2c4f870365E785982E1f101E93b906'],
  ['treasury', '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65'],
]

const pub = createPublicClient({ chain, transport: http(RPC) })
const test = createTestClient({ chain, mode: 'hardhat', transport: http(RPC) })
const wallet = createWalletClient({ account: platform, chain, transport: http(RPC) })
const erc20 = parseAbi(['function transfer(address,uint256) returns (bool)', 'function approve(address,uint256) returns (bool)'])

async function send(w, address, abi, functionName, args) {
  const hash = await w.writeContract({ address, abi, functionName, args })
  const r = await pub.waitForTransactionReceipt({ hash })
  if (r.status !== 'success') throw new Error(`${functionName} reverted`)
}

await test.mine({ blocks: 1 }) // hardhat can't execute at the fork block itself for chain 4663
await send(wallet, RWAID_ADDRESS, RWAID_ABI, 'createProject', ['acme', platform.address, 1_000_000n, false])
const pid = await pub.readContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'nextProjectId' }) - 1n

const { root, entries } = buildMerkleTree(CLIENTS.map(([name, address]) => ({ name, address })))
const body = new FormData()
body.append('file', new File([JSON.stringify({
  registry: RWAID_ADDRESS, chainId: 4663, projectId: String(pid), projectSlug: 'acme', merkleRoot: root,
  generatedAt: new Date().toISOString(), totalEntries: entries.length,
  entries: entries.map(e => ({ name: e.name, wallet: e.address, nameHash: e.nameHash, leaf: e.leaf, proof: e.proof })),
})], 'rwa-id-v4-acme-allowlist.json', { type: 'application/json' }))
body.append('name', 'rwa-id-v4-acme-allowlist')
body.append('network', 'public')
const pin = await (await fetch('https://uploads.pinata.cloud/v3/files', { method: 'POST', headers: { Authorization: `Bearer ${JWT}` }, body })).json()
const cid = pin?.data?.cid
if (!cid) throw new Error('pin failed: ' + JSON.stringify(pin))
await send(wallet, RWAID_ADDRESS, RWAID_ABI, 'updateMerkleRoot', [pid, root, BigInt(entries.length)])

await test.impersonateAccount({ address: USDG_HOLDER })
await test.setBalance({ address: USDG_HOLDER, value: 10n ** 18n })
const holder = createWalletClient({ account: USDG_HOLDER, chain, transport: http(RPC) })
await send(holder, USDG_ADDRESS, erc20, 'transfer', [platform.address, 5_000_000n])
await send(wallet, USDG_ADDRESS, erc20, 'approve', [RWAID_ADDRESS, 3_000_000n])
await send(wallet, RWAID_ADDRESS, RWAID_ABI, 'fundSponsorship', [pid, 3_000_000n])
await send(wallet, RWAID_ADDRESS, RWAID_ABI, 'claimFor', [pid, CLIENTS[0][1], 'joe', entries[0].proof])

console.log(JSON.stringify({ projectId: Number(pid), cid, pinId: pin.data.id, root, owner: platform.address }))
