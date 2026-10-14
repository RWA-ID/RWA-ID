import { useCallback, useEffect, useState } from 'react'
import { RWAID_ADDRESS, RWAID_ABI, IDENTITY_CLAIMED, MERKLE_ROOT_UPDATED, IDENTITY_REVOKED } from './contracts'
import { readClient, getLogsChunked } from './readClient'
import { DEFAULT_PROTOCOL_FEE_PERCENT, treasuryShare } from './format'
import { useRefetchOnFocus } from './useRefetchOnFocus'

const PROJECT_FIELDS = [
  'owner', 'slug', 'slugHash', 'treasury', 'claimFee', 'transferable',
  'merkleRoot', 'active', 'totalClaimed', 'totalRevenue',
]

export function parseProject(result) {
  if (!result) return null
  const arr = Array.isArray(result) ? result : Object.values(result)
  return Object.fromEntries(PROJECT_FIELDS.map((k, i) => [k, arr[i]]))
}

const call = (functionName, args) => ({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName, args })

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

  // `silent` refreshes in place: no loading state, and a failure keeps the figures already shown.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!address) { setProjects([]); setLoading(false); return }
    if (!silent) {
      setLoading(true)
      setError('')
      setLogError('')
    }
    try {
      const [nextId, protocolFeePercent] = await Promise.all([
        readClient.readContract(call('nextProjectId')),
        readClient.readContract(call('protocolFeePercent')),
      ])
      setFeePercent(protocolFeePercent)
      const total = Number(nextId) - 1
      if (total <= 0) { setProjects([]); return }

      const results = await readClient.multicall({
        contracts: Array.from({ length: total }, (_, i) => call('projects', [BigInt(i + 1)])),
        allowFailure: true,
      })
      // A failed read must not quietly drop a project from the operator's list.
      if (results.some(r => r.status !== 'success')) throw new Error('Some project reads failed — refresh to try again.')

      const owned = results
        .map((r, i) => ({ id: i + 1, ...parseProject(r.result) }))
        .filter(p => p.owner?.toLowerCase() === address.toLowerCase())

      // v4 state per owned project: the fee actually charged, the sponsor pool and the artwork.
      const extra = owned.length
        ? await readClient.multicall({
            contracts: owned.flatMap(p => [
              call('effectiveClaimFee', [BigInt(p.id)]),
              call('sponsorBalance', [BigInt(p.id)]),
              call('projectImage', [BigInt(p.id)]),
            ]),
            allowFailure: false,
          })
        : []

      const enriched = owned.map((p, i) => ({
        ...p,
        effectiveFee: extra[i * 3],
        sponsorBalance: extra[i * 3 + 1],
        image: extra[i * 3 + 2],
        // totalRevenue is gross; the treasury only ever received the platform side.
        treasuryRevenue: treasuryShare(p.totalRevenue, protocolFeePercent),
      }))

      // Allowlist size only exists in the MerkleRootUpdated event, not in storage.
      // One unfiltered scan covers every project — far cheaper than a scan each.
      let byProject = null
      try {
        const logs = await getLogsChunked({ address: RWAID_ADDRESS, event: MERKLE_ROOT_UPDATED })
        byProject = new Map()
        for (const l of logs) {
          const id = Number(l.args.projectId)
          byProject.set(id, [...(byProject.get(id) ?? []), l])
        }
      } catch (err) {
        // Counts stay unknown rather than silently reading as zero.
        setLogError(err.message || 'Could not read contract events.')
      }

      setProjects(enriched.map((p) => {
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
      if (!silent) setError(err.shortMessage || err.message || 'Failed to load projects')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [address])

  useEffect(() => { load() }, [load])
  useRefetchOnFocus(() => load({ silent: true }))

  return { projects, loading, error, logError, protocolFeePercent: feePercent, reload: load }
}

/** Recent onchain activity for one project, newest first. */
export async function fetchActivity(projectId, limit = 6) {
  const args = { projectId: BigInt(projectId) }
  const [claims, roots, revokes] = await Promise.all([
    getLogsChunked({ address: RWAID_ADDRESS, event: IDENTITY_CLAIMED, args }),
    getLogsChunked({ address: RWAID_ADDRESS, event: MERKLE_ROOT_UPDATED, args }),
    getLogsChunked({ address: RWAID_ADDRESS, event: IDENTITY_REVOKED, args }),
  ])

  const events = [
    ...claims.map(l => ({
      kind: 'claim', block: l.blockNumber, hash: l.transactionHash,
      tokenId: l.args.tokenId?.toString(), claimer: l.args.claimer, feePaid: l.args.feePaid, label: l.args.label,
    })),
    ...roots.map(l => ({
      kind: 'root', block: l.blockNumber, hash: l.transactionHash, total: Number(l.args.totalAllowlisted),
    })),
    ...revokes.map(l => ({
      kind: 'revoke', block: l.blockNumber, hash: l.transactionHash, tokenId: l.args.tokenId?.toString(),
    })),
  ].sort((a, b) => Number(b.block - a.block)).slice(0, limit)

  // Resolve timestamps only for the handful of events we actually render.
  const stamps = {}
  await Promise.all([...new Set(events.map(e => e.block))].map(async (b) => {
    try {
      stamps[b.toString()] = Number((await readClient.getBlock({ blockNumber: b })).timestamp)
    } catch { /* timestamp is decorative — omit on failure */ }
  }))

  return events.map(e => ({ ...e, timestamp: stamps[e.block.toString()] ?? null }))
}
