import { findPinsByName } from './pinata'

// The proof-set CID is not recoverable from chain state — only the root is
// stored onchain. We keep a local pointer so the console can rebuild the claim
// link instantly, and fall back to the pinning service when this device has
// never seen the project (a different browser, a cleared cache, a new machine).
const key = (projectId) => `rwa-id-allowlist-${projectId}`

export const proofSetName = (slug) => `rwa-id-${slug}-allowlist`

const IPFS_GATEWAYS = [
  cid => `https://gateway.pinata.cloud/ipfs/${cid}`,
  cid => `https://ipfs.io/ipfs/${cid}`,
  cid => `https://dweb.link/ipfs/${cid}`,
]

export function saveAllowlist(projectId, cid, total, root) {
  try {
    localStorage.setItem(key(projectId), JSON.stringify({ cid, total, root, savedAt: Date.now() }))
  } catch { /* private mode / quota — the CID is still shown in this session */ }
}

export function loadAllowlist(projectId) {
  try {
    return JSON.parse(localStorage.getItem(key(projectId))) || null
  } catch {
    return null
  }
}

export function claimUrl(projectId, cid) {
  return `${window.location.origin}/?claim=${projectId}&proofs=${cid}`
}

const sameRoot = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase()

/** Fetch a proof set from the first gateway that answers. */
export async function fetchProofSet(cid) {
  for (const gw of IPFS_GATEWAYS) {
    try {
      const res = await fetch(gw(cid))
      if (!res.ok) continue
      const data = await res.json()
      if (data?.entries) return data
    } catch { /* try the next gateway */ }
  }
  throw new Error('Could not fetch that proof set from any gateway.')
}

/**
 * Find the proof set matching the root a project is currently enforcing.
 *
 * Only a set whose `merkleRoot` equals the onchain root is accepted, so a stale
 * pin — or a same-prefixed project's file — can never produce a broken claim
 * link. Returns { cid, total, root, source } or null when nothing matches.
 */
export async function resolveProofSet({ projectId, slug, merkleRoot }) {
  const cached = loadAllowlist(projectId)
  if (cached?.cid && sameRoot(cached.root, merkleRoot)) {
    return { ...cached, source: 'local' }
  }

  const pins = await findPinsByName(proofSetName(slug))
  for (const pin of pins) {
    try {
      const data = await fetchProofSet(pin.cid)
      if (!sameRoot(data.merkleRoot, merkleRoot)) continue

      const total = data.totalEntries ?? data.entries.length
      saveAllowlist(projectId, pin.cid, total, data.merkleRoot)
      return { cid: pin.cid, total, root: data.merkleRoot, source: 'pinata' }
    } catch { /* try the next pin */ }
  }

  // A local pointer we could not verify is still useful to the operator, but it
  // is labelled unverified so a stale link is never presented as a good one.
  if (cached?.cid) return { ...cached, source: 'local-unverified' }
  return null
}
