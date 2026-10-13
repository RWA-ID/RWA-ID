import { useCallback, useEffect, useState } from 'react'
import { RWAID_ADDRESS, RWAID_ABI } from './contracts'
import { readClient, getLogsChunked } from './readClient'
import { DEFAULT_PROTOCOL_FEE_PERCENT, treasuryShare } from './format'

const PROJECT_FIELDS = [
  'owner', 'slug', 'slugHash', 'treasury', 'claimFee', 'transferable',
  'merkleRoot', 'active', 'totalClaimed', 'totalRevenue',
]

export const MERKLE_ROOT_UPDATED = {
  name: 'MerkleRootUpdated', type: 'event',
  inputs: [
    { name: 'projectId',        type: 'uint256', indexed: true },
    { name: 'newRoot',          type: 'bytes32', indexed: false },
    { name: 'totalAllowlisted', type: 'uint256', indexed: false },
  ],
}

export const IDENTITY_CLAIMED = {
  name: 'IdentityClaimed', type: 'event',
  inputs: [
    { name: 'projectId', type: 'uint256', indexed: true },
    { name: 'nameHash',  type: 'bytes32', indexed: true },
    { name: 'claimer',   type: 'address', indexed: true },
    { name: 'tokenId',   type: 'uint256', indexed: false },
    { name: 'node',      type: 'bytes32', indexed: false },
    { name: 'feePaid',   type: 'uint256', indexed: false },
    // v3 emits the plaintext label, so activity can name the identity without
    // fetching the proof set to reverse the hash.
    { name: 'label',     type: 'string',  indexed: false },
  ],
}

export function parseProject(result) {
  if (!result) return null
  const arr = Array.isArray(result) ? result : Object.values(result)
  return Object.fromEntries(PROJECT_FIELDS.map((k, i) => [k, arr[i]]))
}

/**
 * Loads every project owned by `address` straight from contract state.
 * There is no indexer — nextProjectId bounds a multicall, then we filter by owner.
 */
export function useProjects(address) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [logError, setLogError] = useState('')
  const [feePercent, setFeePercent] = useState(DEFAULT_PROTOCOL_FEE_PERCENT)

  const load = useCallback(async () => {
    if (!address) { setProjects([]); setLoading(false); return }
    setLoading(true)
    setError('')
    setLogError('')
    try {
      const [nextId, protocolFeePercent] = await Promise.all([
        readClient.readContract({
          address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'nextProjectId',
        }),
        readClient.readContract({
          address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'protocolFeePercent',
        }),
      ])
      setFeePercent(protocolFeePercent)
      const total = Number(nextId) - 1
      if (total <= 0) { setProjects([]); return }

      const calls = Array.from({ length: total }, (_, i) => ({
        address: RWAID_ADDRESS, abi: RWAID_ABI,
        functionName: 'projects', args: [BigInt(i + 1)],
      }))
      const results = await readClient.multicall({ contracts: calls, allowFailure: true })

      const owned = results
        .map((r, i) => (r.result ? { id: i + 1, ...parseProject(r.result) } : null))
        .filter(p => p && p.owner?.toLowerCase() === address.toLowerCase())
        // totalRevenue is gross; what the treasury actually received is the
        // platform side of the split. Screens should read treasuryRevenue.
        .map(p => ({ ...p, treasuryRevenue: treasuryShare(p.totalRevenue, protocolFeePercent) }))

      // Allowlist size only exists in the MerkleRootUpdated event, not in storage.
      // One unfiltered scan covers every project — far cheaper than a scan each.
      let byProject = null
      try {
        const logs = await getLogsChunked({ address: RWAID_ADDRESS, event: MERKLE_ROOT_UPDATED })
        byProject = new Map()
        for (const l of logs) {
          const id = Number(l.args.projectId)
          const seen = byProject.get(id) ?? []
          seen.push(l)
          byProject.set(id, seen)
        }
      } catch (err) {
        // Counts stay unknown rather than silently reading as zero.
        setLogError(err.message || 'Could not read contract events.')
      }

      setProjects(owned.map((p) => {
        if (!byProject) return { ...p, allowlisted: null, rootBlock: null, rootUpdates: null }
        const logs = byProject.get(p.id) ?? []
        const last = logs[logs.length - 1]
        return {
          ...p,
          allowlisted: last ? Number(last.args.totalAllowlisted) : null,
          rootBlock:   last ? last.blockNumber : null,
          rootUpdates: logs.length,
        }
      }))
    } catch (err) {
      setError(err.shortMessage || err.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => { load() }, [load])

  return { projects, loading, error, logError, protocolFeePercent: feePercent, reload: load }
}

/** Recent onchain activity for one project, newest first. */
export async function fetchActivity(projectId, limit = 6) {
  const [claims, roots] = await Promise.all([
    getLogsChunked({ address: RWAID_ADDRESS, event: IDENTITY_CLAIMED,   args: { projectId: BigInt(projectId) } }),
    getLogsChunked({ address: RWAID_ADDRESS, event: MERKLE_ROOT_UPDATED, args: { projectId: BigInt(projectId) } }),
  ])

  const events = [
    ...claims.map(l => ({
      kind: 'claim',
      block: l.blockNumber,
      hash: l.transactionHash,
      tokenId: l.args.tokenId?.toString(),
      claimer: l.args.claimer,
      feePaid: l.args.feePaid,
      label: l.args.label,
    })),
    ...roots.map(l => ({
      kind: 'root',
      block: l.blockNumber,
      hash: l.transactionHash,
      total: Number(l.args.totalAllowlisted),
    })),
  ].sort((a, b) => Number(b.block - a.block)).slice(0, limit)

  // Resolve timestamps only for the handful of events we actually render.
  const blocks = [...new Set(events.map(e => e.block))]
  const stamps = {}
  await Promise.all(blocks.map(async (b) => {
    try {
      const blk = await readClient.getBlock({ blockNumber: b })
      stamps[b.toString()] = Number(blk.timestamp)
    } catch { /* timestamp is decorative — omit on failure */ }
  }))

  return events.map(e => ({ ...e, timestamp: stamps[e.block.toString()] ?? null }))
}
