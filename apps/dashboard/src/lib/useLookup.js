import { useCallback, useState } from 'react'
import { keccak256, toBytes } from 'viem'
import { RWAID_ADDRESS, RWAID_ABI } from './contracts'
import { readClient } from './readClient'

/**
 * Resolves a name straight from contract state — hash the label, derive the node,
 * then multicall. No event scanning, so it works regardless of log retention.
 */
export function useLookup(projectId) {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const reset = useCallback(() => { setResult(null); setError('') }, [])

  const lookup = useCallback(async (rawName) => {
    const name = rawName.trim().toLowerCase()
    if (!name) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const nameHash = keccak256(toBytes(name))
      const node = await readClient.readContract({
        address: RWAID_ADDRESS, abi: RWAID_ABI,
        functionName: 'nameNodeFromHash', args: [BigInt(projectId), nameHash],
      })

      const [tokenIdRes, claimedRes, revokedRes] = await readClient.multicall({
        contracts: [
          { address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'nodeToTokenId', args: [node] },
          { address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'nodeClaimed',   args: [node] },
          { address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'revoked',       args: [BigInt(projectId), nameHash] },
        ],
        allowFailure: true,
      })

      // A failed read is not "false". Defaulting it would show a throttled RPC
      // as an unclaimed name, and offer to issue or revoke on that basis.
      const failed = [tokenIdRes, claimedRes, revokedRes].find(r => r.status !== 'success')
      if (failed) throw failed.error ?? new Error('A registry read failed — try again.')
      const tokenId   = tokenIdRes.result
      const isClaimed = claimedRes.result
      const isRevoked = revokedRes.result

      // ownerOf reverts for a burned token, so only ask when the name still holds one.
      // A live token's holder must read cleanly; there is no safe default for it.
      let holder = null
      let transferable = null
      if (isClaimed && !isRevoked && tokenId > 0n) {
        ;[holder, transferable] = await Promise.all([
          readClient.readContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'ownerOf', args: [tokenId] }),
          readClient.readContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'tokenTransferable', args: [tokenId] }),
        ])
      }

      setResult({ name, nameHash, node, tokenId: tokenId.toString(), isClaimed, isRevoked, holder, transferable })
    } catch (err) {
      setError(err.shortMessage || err.message || 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  return { result, loading, error, lookup, reset }
}
