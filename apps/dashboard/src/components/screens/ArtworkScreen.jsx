import { useRef, useState } from 'react'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { pinFile } from '../../lib/pinata'
import TxDrawer, { useTx } from '../TxDrawer'
import { RwaMark } from '../Brand'

const MAX_BYTES = 5 * 1024 * 1024
const TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']

/** Mirrors RWAIDv4.setProjectImage: ipfs/https/ar, ≤512 chars, printable ASCII without " \ < >. */
export function imageProblem(uri) {
  if (!uri) return null
  if (uri.length > 512) return 'Use a link of 512 characters or fewer.'
  if (!/^(ipfs:\/\/|https:\/\/|ar:\/\/)/.test(uri)) return 'Use an ipfs://, https:// or ar:// link.'
  if (!/^[\x21-\x7E]+$/.test(uri) || /["\\<>]/.test(uri)) return 'The link contains spaces or characters the contract rejects (" \\ < >).'
  return null
}

export function artUrl(uri) {
  if (!uri) return null
  if (uri.startsWith('ipfs://')) return `https://ipfs.onchain-id.id/ipfs/${uri.slice(7)}`
  if (uri.startsWith('ar://')) return `https://arweave.net/${uri.slice(5)}`
  return uri
}

export default function ArtworkScreen({ project, projectId, refresh }) {
  const [uri, setUri] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [drawer, setDrawer] = useState(false)
  const fileRef = useRef(null)
  const tx = useTx()

  const current = project.image
  const problem = imageProblem(uri.trim())
  const preview = artUrl(uri.trim() && !problem ? uri.trim() : current)

  const upload = async (file) => {
    if (!file) return
    setError('')
    if (!TYPES.includes(file.type)) { setError('Use a PNG, JPEG, GIF, WebP or SVG image.'); return }
    if (file.size > MAX_BYTES) { setError('Keep the image under 5 MB.'); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const cid = await pinFile(file, `rwa-id-v4-${project.slug}-art.${ext}`)
      setUri(`ipfs://${cid}`)
    } catch (err) {
      setError(err.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const target = uri.trim()
  const resetting = target === '' && !!current

  return (
    <div className="grid grid-2">
      <div className="card card-pad">
        <span className="card-title">NFT artwork for every {project.slug} name</span>
        <span className="note">
          Every identity under {project.slug}.rwa-id.eth shows this image on OpenSea and in wallets. Leave it unset and
          each name uses the RWA ID card, drawn on-chain. Changing it updates every existing name: the contract tells
          marketplaces to refresh.
        </span>
        <div className="art-preview">
          <div className="frame">
            {preview ? <img src={preview} alt={`${project.slug} artwork`} /> : <RwaMark size={72} tone="light" />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span className="label">{uri.trim() && !problem ? 'New artwork' : current ? 'Current artwork' : 'Default'}</span>
            <span className="mono" style={{ fontSize: 12, overflowWrap: 'anywhere', color: 'var(--muted)' }}>{target || current || 'RWA ID card (on-chain SVG)'}</span>
          </div>
        </div>
        <button type="button" className="dropzone" style={{ minHeight: 120 }} onClick={() => fileRef.current?.click()} disabled={uploading}>
          <span className="up">{uploading ? <span className="spinner" /> : '↑'}</span>
          <b>{uploading ? 'Pinning to IPFS…' : 'Upload an image'}</b>
          <span className="meta">PNG, JPEG, GIF, WebP or SVG · square works best · under 5 MB</span>
        </button>
        <input ref={fileRef} type="file" accept={TYPES.join(',')} hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
        <label className="field">
          <span className="label">Or paste a link</span>
          <input className={`input${problem ? ' bad' : ''}`} value={uri} onChange={(e) => setUri(e.target.value)} placeholder="ipfs://… or https://…" spellCheck="false" />
          {problem && <span className="hint bad">{problem}</span>}
        </label>
        {error && <div className="notice danger"><span className="n-icon">!</span><span>{error}</span></div>}
        <div className="row">
          <button className="btn btn-ink" disabled={!target || !!problem || target === current} onClick={() => setDrawer(true)}>Set artwork</button>
          {current && <button className="btn" onClick={() => { setUri(''); setDrawer(true) }}>Use the RWA ID card instead</button>}
        </div>
      </div>

      <div className="card ink card-pad">
        <span className="label" style={{ color: 'var(--steel)' }}>How it shows up</span>
        <span className="note" style={{ color: 'var(--steel)' }}>
          Marketplaces read each name’s metadata from the registry. With your image set, a name looks like this:
        </span>
        <div className="kv">
          <div className="kv-row"><span>name</span><span>joe.{project.slug}.rwa-id.eth</span></div>
          <div className="kv-row"><span>image</span><span style={{ color: 'var(--lime)' }}>{target && !problem ? target : current || 'on-chain SVG card'}</span></div>
          <div className="kv-row"><span>traits</span><span>namespace · label · soulbound</span></div>
        </div>
        <span className="note" style={{ color: 'var(--steel)' }}>
          Use artwork you own or are licensed to use. A pinned IPFS image stays reachable as long as it is pinned; an https
          link is only as durable as the server behind it.
        </span>
      </div>

      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        title={resetting ? 'Use the RWA ID card' : 'Set project artwork'}
        summary={resetting ? `Every ${project.slug} name goes back to the on-chain RWA ID card.` : `Every ${project.slug} name shows this image.`}
        rows={[{ k: 'Artwork', v: resetting ? 'RWA ID card' : target.length > 40 ? `${target.slice(0, 40)}…` : target }]}
        fn="setProjectImage(uint256,string)"
        onSign={() => tx.writeContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'setProjectImage', args: [BigInt(projectId), resetting ? '' : target] })}
        onDone={() => { setUri(''); refresh() }}
      />
    </div>
  )
}
