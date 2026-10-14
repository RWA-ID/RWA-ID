import { useMemo, useRef, useState } from 'react'
import { isAddress } from 'viem'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { parseCSVRaw, buildMerkleTree, normalizeLabel } from '../../lib/merkle'
import { pinJSON } from '../../lib/pinata'
import { claimUrl, fetchProofSet, proofSetName, saveAllowlist } from '../../lib/allowlistStore'
import { useProofSet } from '../../lib/useProofSet'
import { num, shortHash, ZERO_ROOT } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'

const PROOF_META = {
  local: 'verified · matches live root',
  pinata: 'recovered from IPFS · matches live root',
  'local-unverified': 'local record · could not verify',
  loading: 'looking it up…',
  missing: 'no pinned set matches the live root',
  error: 'lookup failed',
  idle: 'no root published',
}

const labelError = (name) => { try { normalizeLabel(name); return null } catch (e) { return e.message } }

export default function AllowlistScreen({ project, projectId, refresh }) {
  const [mode, setMode] = useState('csv')
  const [rows, setRows] = useState([{ name: '', wallet: '' }])
  const [fileName, setFileName] = useState('')
  const [cidInput, setCidInput] = useState('')
  const [cidState, setCidState] = useState({ tone: '', text: '' })
  const [loadingCid, setLoadingCid] = useState(false)
  const [staged, setStaged] = useState(null)
  const [building, setBuilding] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const fileRef = useRef(null)
  const tx = useTx()

  const { proofSet: saved, state: proofState, error: proofError, override: setSaved } = useProofSet(project, projectId)
  const hasRoot = project.merkleRoot && project.merkleRoot !== ZERO_ROOT

  const filled = rows.filter(r => r.name.trim() || r.wallet.trim())
  const validRows = useMemo(() => rows.filter(r => !labelError(r.name) && isAddress(r.wallet.trim())), [rows])
  const invalid = filled.length - validRows.length
  const lowered = validRows.filter(r => r.name.trim() !== r.name.trim().toLowerCase()).length
  const duplicates = useMemo(() => {
    const seen = new Set(); let n = 0
    for (const r of validRows) { const k = r.name.trim().toLowerCase(); if (seen.has(k)) n++; seen.add(k) }
    return n
  }, [validRows])

  const resetStaging = () => { setStaged(null); setError(''); setBuilding('') }

  const ingestFile = (file) => {
    if (!file) return
    resetStaging()
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseCSVRaw(ev.target.result)
        setRows(parsed)
        setFileName(`${file.name} · ${num(parsed.length)} rows`)
        setError('')
      } catch (err) {
        setError(err.message)
      }
    }
    reader.onerror = () => setError('Could not read that file.')
    reader.readAsText(file)
  }

  const loadCid = async (cid) => {
    if (!cid) return
    setLoadingCid(true)
    setCidState({ tone: '', text: 'Fetching proof set…' })
    try {
      const data = await fetchProofSet(cid)
      const existing = (data.entries || []).map(e => ({ name: e.name || '', wallet: e.wallet || e.address || '' }))
      if (existing.length === 0) throw new Error('That proof set has no entries.')
      setRows([...existing, { name: '', wallet: '' }])
      setMode('manual')
      resetStaging()
      setCidState({ tone: 'good', text: `Loaded ${num(existing.length)} existing entries. New rows are appended.` })
    } catch (err) {
      setCidState({ tone: 'bad', text: err.message || 'Could not fetch that CID.' })
    } finally {
      setLoadingCid(false)
    }
  }

  const buildAndPin = async () => {
    if (validRows.length === 0 || invalid > 0) return
    setError('')
    try {
      setBuilding('Building the tree in your browser…')
      const { root, entries } = buildMerkleTree(validRows.map(r => ({ name: r.name.trim(), address: r.wallet.trim() })))
      setBuilding('Pinning proofs to IPFS…')
      const cid = await pinJSON({
        registry: RWAID_ADDRESS,
        chainId: 4663,
        projectId: String(projectId),
        projectSlug: project.slug,
        merkleRoot: root,
        generatedAt: new Date().toISOString(),
        totalEntries: entries.length,
        entries: entries.map(e => ({ name: e.name, wallet: e.address, nameHash: e.nameHash, leaf: e.leaf, proof: e.proof })),
      }, proofSetName(project.slug))
      // Not cached until the root is confirmed on-chain (see onDone).
      setStaged({ root, entries, cid })
      setDrawer(true)
    } catch (err) {
      setError(err.message || 'Could not build or pin the allowlist.')
    } finally {
      setBuilding('')
    }
  }

  const sign = () => tx.writeContract({
    address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'updateMerkleRoot',
    args: [BigInt(projectId), staged.root, BigInt(staged.entries.length)],
  })

  const linkCid = saved?.cid
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(claimUrl(projectId, linkCid)); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* visible */ }
  }

  const preview = (filled.length ? filled : []).slice(0, 60)

  return (
    <div className="grid grid-2">
      <div className="card card-pad">
        <div className="segmented">
          <button className={mode === 'csv' ? 'on' : ''} onClick={() => setMode('csv')}>CSV upload</button>
          <button className={mode === 'manual' ? 'on' : ''} onClick={() => setMode('manual')}>Manual entry</button>
        </div>

        {mode === 'csv' ? (
          <>
            <button type="button" className={`dropzone${dragging ? ' over' : ''}`} onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); ingestFile(e.dataTransfer.files?.[0]) }}>
              <span className="up">↑</span>
              <b>{fileName || 'Drop a CSV or click to browse'}</b>
              <span className="meta" style={{ fontSize: 12 }}>{fileName ? 'parsed locally · nothing uploaded yet' : 'two columns: name,wallet'}</span>
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { ingestFile(e.target.files?.[0]); e.target.value = '' }} />
          </>
        ) : (
          <>
            <div className="field">
              <span className="label">Extend the live allowlist</span>
              <div className="input-affix">
                <input value={cidInput} onChange={(e) => setCidInput(e.target.value)} placeholder="bafy… (proof set CID)" />
                {saved?.cid && <button className="btn btn-sm" disabled={loadingCid} onClick={() => { setCidInput(saved.cid); loadCid(saved.cid) }}>Use live set</button>}
                <button className="btn btn-sm btn-ink" disabled={!cidInput.trim() || loadingCid} onClick={() => loadCid(cidInput.trim())}>{loadingCid ? 'Loading…' : 'Load'}</button>
              </div>
              <span className={`hint ${cidState.tone}`}>{cidState.text || 'Publishing replaces the whole list, so load the live set first to keep everyone already on it.'}</span>
            </div>
            <div className="tbl">
              <div className="tbl-head" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr) 30px' }}><span>Name</span><span>Wallet</span><span /></div>
              <div className="tbl-scroll">
                {rows.map((r, i) => (
                  <div key={i} className="tbl-row" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr) 30px', padding: '6px 10px' }}>
                    <input className={`cell-input${r.name.trim() && labelError(r.name) ? ' bad' : ''}`} placeholder="joe" value={r.name}
                      onChange={(e) => { resetStaging(); setRows(rows.map((x, n) => n === i ? { ...x, name: e.target.value } : x)) }} />
                    <input className={`cell-input${r.wallet.trim() && !isAddress(r.wallet.trim()) ? ' bad' : ''}`} placeholder="0x… wallet" value={r.wallet}
                      onChange={(e) => { resetStaging(); setRows(rows.map((x, n) => n === i ? { ...x, wallet: e.target.value } : x)) }} />
                    <button className="icon-x" aria-label={`Remove row ${i + 1}`}
                      onClick={() => setRows(rows.length === 1 ? [{ name: '', wallet: '' }] : rows.filter((_, n) => n !== i))}>✕</button>
                  </div>
                ))}
              </div>
              <button className="btn btn-sm" style={{ margin: 8, alignSelf: 'flex-start' }} onClick={() => setRows([...rows, { name: '', wallet: '' }])}>+ Add row</button>
            </div>
          </>
        )}

        {mode === 'csv' && preview.length > 0 && (
          <div className="tbl">
            <div className="tbl-head" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr) 84px' }}><span>Name</span><span>Wallet</span><span>Status</span></div>
            <div className="tbl-scroll">
              {preview.map((r, i) => {
                const err = labelError(r.name) || (!isAddress(r.wallet.trim()) ? 'bad wallet' : null)
                const fixed = !err && r.name.trim() !== r.name.trim().toLowerCase()
                return (
                  <div key={i} className="tbl-row" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr) 84px' }} title={err || ''}>
                    <b>{fixed ? `${r.name.trim()} → ${r.name.trim().toLowerCase()}` : r.name}</b>
                    <span style={{ color: 'var(--muted)' }}>{r.wallet}</span>
                    <span className={`pill ${err ? 'orange' : fixed ? 'orange' : ''}`} style={{ justifySelf: 'start', fontSize: 10 }}>{err ? 'Invalid' : fixed ? 'Fixed' : 'Ready'}</span>
                  </div>
                )
              })}
            </div>
            {filled.length > preview.length && <div className="tbl-foot">+{num(filled.length - preview.length)} more rows</div>}
          </div>
        )}

        {error && <div className="notice danger"><span className="n-icon">!</span><span>{error}</span></div>}
      </div>

      <div className="stack">
        <div className="card ink card-pad">
          <span className="label" style={{ color: 'var(--steel)' }}>{validRows.length ? 'Ready to publish' : 'Live allowlist'}</span>
          <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {num(validRows.length || project.allowlisted || 0)} <span style={{ fontSize: 18, color: 'var(--steel)' }}>entries</span>
          </span>
          <div className="kv">
            <div className="kv-row"><span>New root</span><span style={{ color: 'var(--lime)' }}>{staged ? shortHash(staged.root) : validRows.length ? 'built on publish' : '—'}</span></div>
            <div className="kv-row"><span>Live root</span><span>{hasRoot ? shortHash(project.merkleRoot) : 'not set'}</span></div>
            <div className="kv-row"><span>Proofs pinned to</span><span>IPFS · Pinata</span></div>
            <div className="kv-row"><span>Lowercased labels</span><span style={{ color: lowered ? 'var(--orange-soft)' : undefined }}>{num(lowered)}</span></div>
            {invalid > 0 && <div className="kv-row"><span>Invalid rows</span><span style={{ color: 'var(--orange-soft)' }}>{num(invalid)} · fix before publishing</span></div>}
            {duplicates > 0 && <div className="kv-row"><span>Duplicate names</span><span style={{ color: 'var(--orange-soft)' }}>{num(duplicates)} · first claim wins</span></div>}
          </div>
          <button className="btn btn-lime btn-lg btn-full" disabled={!validRows.length || invalid > 0 || !!building} onClick={buildAndPin}>
            {building ? <><span className="spinner" />{building}</> : 'Pin & publish root →'}
          </button>
          <span className="meta" style={{ color: 'var(--faint)' }}>Existing claims are unaffected by a new root.</span>
        </div>

        <div className="card card-pad">
          <span className="card-title">Claim link</span>
          {linkCid ? (
            <>
              <span className="claim-link" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>{claimUrl(projectId, linkCid)}</span>
              <div className="row">
                <button className="btn btn-sm btn-ink" onClick={copyLink}>{copied ? 'Copied ✓' : 'Copy link'}</button>
                <a className="btn btn-sm" href={claimUrl(projectId, linkCid)} target="_blank" rel="noreferrer">Open ↗</a>
              </div>
              <span className="meta">{PROOF_META[saved.source] ?? ''}</span>
            </>
          ) : (
            <span className="note">{proofState === 'loading' ? 'Locating the proof set…' : proofState === 'error' ? proofError : hasRoot ? 'No pinned proof set matches the live root, so the link cannot be rebuilt. Re-publish the allowlist to restore it.' : 'Publish an allowlist to get the link your clients claim with.'}</span>
          )}
        </div>

        <div className="card card-pad" style={{ gap: 8 }}>
          <span className="card-title" style={{ fontSize: 15 }}>Label rules</span>
          <span className="note">
            Lowercase a–z, 0–9 and hyphens, 1–63 characters. Underscores only at the start, and no “--” in the third and
            fourth positions. These are the ENS rules wallets enforce, so the console lowercases names before building the
            tree and rejects anything a wallet could not resolve.
          </span>
        </div>
      </div>

      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        title="Publish allowlist"
        summary={`Opens claiming for ${num(staged?.entries.length ?? 0)} allowlisted wallets.`}
        rows={[
          { k: 'Current root', v: hasRoot ? shortHash(project.merkleRoot, 8, 6) : 'not set' },
          { k: 'New root', v: staged ? shortHash(staged.root, 8, 6) : '—' },
          { k: 'Entries', v: `${project.allowlisted != null ? num(project.allowlisted) : 0} → ${num(staged?.entries.length ?? 0)}` },
          { k: 'Proof set', v: staged ? `${staged.cid.slice(0, 12)}…` : '—' },
        ]}
        fn="updateMerkleRoot(uint256,bytes32,uint256)"
        onSign={sign}
        onDone={() => {
          if (staged) {
            saveAllowlist(projectId, staged.cid, staged.entries.length, staged.root)
            setSaved({ cid: staged.cid, total: staged.entries.length, root: staged.root, source: 'local' })
          }
          setStaged(null)
          setRows([{ name: '', wallet: '' }])
          setFileName('')
          refresh()
        }}
      />
    </div>
  )
}
