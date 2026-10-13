const PINATA_JWT = import.meta.env.VITE_PINATA_JWT

export async function pinJSON(data, name) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const file = new File([blob], `${name}.json`, { type: 'application/json' })

  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', name)
  formData.append('network', 'public')

  const res = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  })

  const result = await res.json()
  const cid = result?.data?.cid
  if (!cid) throw new Error('Pinata: no CID returned — ' + JSON.stringify(result))
  return cid
}

/**
 * Look up pinned files by name, newest first.
 *
 * Pinata's `name` filter is a *contains* match, so "rwa-id-project-allowlist"
 * would also match "rwa-id-project2-allowlist". Callers get exact matches only.
 */
export async function findPinsByName(name) {
  const res = await fetch(
    `https://api.pinata.cloud/v3/files/public?name=${encodeURIComponent(name)}&limit=100`,
    { headers: { Authorization: `Bearer ${PINATA_JWT}` } },
  )
  if (!res.ok) throw new Error(`Pinata: file lookup failed (${res.status})`)

  const files = (await res.json())?.data?.files ?? []
  return files
    .filter(f => f.name === name)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}
