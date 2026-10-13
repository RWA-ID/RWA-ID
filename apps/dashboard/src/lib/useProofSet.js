import { useCallback, useEffect, useState } from 'react'
import { resolveProofSet } from './allowlistStore'
import { ZERO_ROOT } from './format'

/**
 * Resolves the proof set backing a project's live Merkle root, recovering it
 * from the pinning service when this device has no local record.
 *
 * `state` is 'idle' | 'loading' | 'found' | 'missing' | 'error'.
 */
export function useProofSet(project, projectId) {
  const [proofSet, setProofSet] = useState(null)
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')

  const root = project?.merkleRoot
  const slug = project?.slug
  const hasRoot = root && root !== ZERO_ROOT

  const resolve = useCallback(async (signal) => {
    if (!hasRoot) { setProofSet(null); setState('idle'); return }
    setState('loading')
    setError('')
    try {
      const found = await resolveProofSet({ projectId, slug, merkleRoot: root })
      if (signal?.aborted) return
      setProofSet(found)
      setState(found ? 'found' : 'missing')
    } catch (err) {
      if (signal?.aborted) return
      setProofSet(null)
      setState('error')
      setError(err.message || 'Could not look up the proof set.')
    }
  }, [projectId, slug, root, hasRoot])

  useEffect(() => {
    const ctrl = new AbortController()
    resolve(ctrl.signal)
    return () => ctrl.abort()
  }, [resolve])

  // Lets a freshly pinned set replace the resolved one without a round trip.
  const override = useCallback((next) => {
    setProofSet(next)
    setState(next ? 'found' : 'missing')
  }, [])

  return { proofSet, state, error, reload: () => resolve(), override }
}
