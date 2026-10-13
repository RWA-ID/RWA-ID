import { useMemo, useRef, useState } from 'react'
import { isAddress } from 'viem'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { parseCSV, buildMerkleTree, normalizeLabel } from '../../lib/merkle'
import { pinJSON } from '../../lib/pinata'
import { claimUrl, fetchProofSet, proofSetName, saveAllowlist } from '../../lib/allowlistStore'
import { useProofSet } from '../../lib/useProofSet'
import { num, shortHash, ZERO_ROOT } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'
import { ArrowRight, Check, Close, Copy, Plus, Upload, Warning } from '../icons'

const PROOF_META = {
  local:             'verified · matches live root',
  pinata:            'recovered from IPFS · matches live root',
  'local-unverified': 'local record · could not verify',
  loading:           'looking it up…',
  missing:           'no pinned set matches the live root',
  error:             'lookup failed',
  idle:              'no root published',
}

export default function AllowlistScreen({ project, projectId, refresh }) {
  const [mode, setMode] = useState('csv')
  const [rows, setRows] = useState([{ name: '', wallet: '' }])
  const [cidInput, setCidInput] = useState('')
  const [cidState, setCidState] = useState({ tone: '', text: '' })
  const [loadingCid, setLoadingCid] = useState(false)
  const [staged, setStaged]   = useState(null)   // { root, entries, cid }
  const [building, setBuilding] = useState('')
  const [error, setError]     = useState('')
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [drawer, setDrawer]   = useState(false)

  const { proofSet: saved, state: proofState, error: proofError, override: setSaved } =
    useProofSet(project, projectId)

  const fileRef = useRef(null)
  const tx = useTx()

  const hasRoot = project.merkleRoot && project.merkleRoot !== ZERO_ROOT

  const isValidLabel = (name) => {
    try { normalizeLabel(name); return true } catch { return false }
  }

  const validRows = useMemo(
    () => rows.filter(r => isValidLabel(r.name) && isAddress(r.wallet.trim())),
    [rows],
  )

  const resetStaging = () => { setStaged(null); setError(''); setBuilding('') }

  /* ── CSV ──────────────────────────────────────────────────────────────── */
  const ingestFile = (file) => {
    if (!file) return
    resetStaging()
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result)
        setRows(parsed.map(r => ({ name: r.name, wallet: r.address })))
        setMode('manual')
        setError('')
      } catch (err) {
        setError(err.message)
      }
    }
    reader.onerror = () => setError('Could not read that file.')
    reader.readAsText(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    ingestFile(e.dataTransfer.files?.[0])
  }

  /* ── Extend from an existing pinned proof set ─────────────────────────── */
  const loadCid = async (cid) => {
    if (!cid) return
    setLoadingCid(true)
    setCidState({ tone: '', text: 'Fetching proof set…' })
    try {
      const data = await fetchProofSet(cid)
      const existing = (data.entries || []).map(e => ({
        name: e.name || '',
        wallet: e.wallet || e.address || '',
      }))
      if (existing.length === 0) throw new Error('That proof set has no entries.')
      setRows([...existing, { name: '', wallet: '' }])
      setMode('manual')
      resetStaging()
      setCidState({ tone: 'hint-good', text: `Loaded ${num(existing.length)} existing entries — new rows will be appended.` })
    } catch (err) {
      setCidState({ tone: 'hint-danger', text: err.message || 'Could not fetch that CID.' })
    } finally {
      setLoadingCid(false)
    }
  }

  const loadFromIpfs = () => loadCid(cidInput.trim())

  /* ── Build + pin ──────────────────────────────────────────────────────── */
  const buildAndPin = async () => {
    if (validRows.length === 0) return
    setError('')
    try {
      setBuilding('Building the Merkle tree in your browser…')
      const source = validRows.map(r => ({ name: r.name.trim(), address: r.wallet.trim() }))
      const { root, entries } = buildMerkleTree(source)

      setBuilding('Pinning proofs to IPFS…')
      const cid = await pinJSON({
        projectId: String(projectId),
        projectSlug: project.slug,
        merkleRoot: root,
        generatedAt: new Date().toISOString(),
        totalEntries: entries.length,
        entries: entries.map(e => ({
          name: e.name, wallet: e.address, nameHash: e.nameHash, leaf: e.leaf, proof: e.proof,
        })),
      }, proofSetName(project.slug))

      // Not cached yet: this CID only becomes the project's proof set once the
      // staged root is confirmed onchain (see the drawer's onDone).
      setStaged({ root, entries, cid })
    } catch (err) {
      setError(err.message || 'Could not build or pin the allowlist.')
    } finally {
      setBuilding('')
    }
  }

  const sign = () => {
    tx.writeContract({
      address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'updateMerkleRoot',
      args: [BigInt(projectId), staged.root, BigInt(staged.entries.length)],
    })
  }

  const copyClaimLink = async (cid) => {
    try {
      await navigator.clipboard.writeText(claimUrl(projectId, cid))
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch { /* clipboard blocked — the link is visible for manual copy */ }
  }

  const duplicates = useMemo(() => {
    const seen = new Set()
    let count = 0
    for (const r of validRows) {
      const k = r.name.trim().toLowerCase()
      if (seen.has(k)) count++
      seen.add(k)
    }
    return count
  }, [validRows])

  const invalidCount = rows.filter(
    r => (r.name.trim() || r.wallet.trim()) && (!isAddress(r.wallet.trim()) || !isValidLabel(r.name)),
  ).length
  const linkCid = staged?.cid || saved?.cid

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="screen-title" style={{ marginBottom: 7 }}>Allowlist</h1>
        <p className="screen-sub maxw-640">
          Who may claim an identity under {project.slug}.rwa-id.eth. The tree is built in your browser and
          pinned to IPFS — only the root goes onchain, so client lists never touch a server you do not control.
        </p>
      </div>

      <div className="stat-strip" style={{ '--cols': 3, marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-label">Live root</div>
          <div className="stat-value data">{hasRoot ? shortHash(project.merkleRoot, 10, 8) : 'Not set'}</div>
          <div className="stat-meta">
            {project.rootUpdates ? `${project.rootUpdates} update${project.rootUpdates === 1 ? '' : 's'}` : 'never published'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Entries</div>
          <div className="stat-value sm">{project.allowlisted != null ? num(project.allowlisted) : '—'}</div>
          <div className="stat-meta">{num(project.totalClaimed)} claimed</div>
        </div>
        <div className="stat">
          <div className="stat-label">Proof set</div>
          <div className="stat-value data">
            {saved?.cid ? (
              <a href={`https://ipfs.io/ipfs/${saved.cid}`} target="_blank" rel="noreferrer">{saved.cid.slice(0, 14)}…</a>
            ) : proofState === 'loading' ? <span className="spinner" /> : '—'}
          </div>
          <div className="stat-meta">{PROOF_META[saved ? saved.source : proofState] ?? ''}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          Stage a new root
          <div className="segmented" style={{ marginLeft: 'auto' }}>
            <button className={mode === 'csv' ? 'is-active' : ''} onClick={() => setMode('csv')}>CSV upload</button>
            <button className={mode === 'manual' ? 'is-active' : ''} onClick={() => setMode('manual')}>Manual entry</button>
          </div>
        </div>

        {/* ── Staged result ── */}
        {staged ? (
          <div>
            <div className="notice notice-good" style={{ margin: '20px 20px 0', flexDirection: 'column', gap: 14 }}>
              <div className="row" style={{ gap: 9 }}>
                <Check size={15} width={1.7} />
                <span style={{ fontWeight: 500 }}>
                  Tree computed locally — {num(staged.entries.length)} entries
                  {duplicates > 0 ? `, ${duplicates} duplicate name${duplicates === 1 ? '' : 's'} collapsed` : ', 0 duplicates'}
                </span>
              </div>
              <div className="compare" style={{ width: '100%' }}>
                <div className="compare-cell">
                  <div className="mono-label" style={{ marginBottom: 7 }}>Current root</div>
                  <div className="compare-value data">{hasRoot ? shortHash(project.merkleRoot, 10, 8) : 'Not set'}</div>
                  <div className="mono-note" style={{ marginTop: 6 }}>
                    {project.allowlisted != null ? `${num(project.allowlisted)} entries` : 'no entries'}
                  </div>
                </div>
                <ArrowRight size={16} className="compare-arrow" />
                <div className="compare-cell staged">
                  <div className="mono-label" style={{ marginBottom: 7 }}>Staged root</div>
                  <div className="compare-value data">{shortHash(staged.root, 10, 8)}</div>
                  <div className="mono-note" style={{ marginTop: 6, color: 'var(--good)' }}>
                    {num(staged.entries.length)} entries
                  </div>
                </div>
              </div>
            </div>

            <div className="tbl" style={{ margin: '18px 20px 0' }}>
              <div className="tbl-head" style={{ gridTemplateColumns: '34px 1.1fr 1.6fr' }}>
                <span>#</span><span>NAME</span><span>WALLET</span>
              </div>
              <div className="tbl-scroll">
                {staged.entries.slice(0, 50).map((e, i) => (
                  <div key={e.leaf} className="tbl-row" style={{ gridTemplateColumns: '34px 1.1fr 1.6fr' }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--faint)' }}>{i + 1}</span>
                    <span style={{ font: '500 12.5px/1 var(--f-sans)' }}>{e.name}</span>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', overflowWrap: 'anywhere' }}>{e.address}</span>
                  </div>
                ))}
              </div>
              {staged.entries.length > 50 && (
                <div className="tbl-foot">+{num(staged.entries.length - 50)} more rows</div>
              )}
            </div>

            <div className="row row-wrap" style={{ padding: '18px 20px' }}>
              <button className="btn" onClick={resetStaging}>Discard</button>
              <button className="btn btn-accent" onClick={() => setDrawer(true)}>
                Review transaction<ArrowRight size={13} />
              </button>
              <span className="mono-note">existing claims are unaffected</span>
            </div>
          </div>
        ) : mode === 'csv' ? (
          /* ── CSV upload ── */
          <div className="card-body">
            <div
              className={`dropzone${dragging ? ' is-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <div className="dropzone-icon"><Upload size={18} /></div>
              <div className="dropzone-title">Drop your client CSV here</div>
              <div className="dropzone-sub">Two columns: name, wallet</div>
              <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>Choose file</button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => { ingestFile(e.target.files?.[0]); e.target.value = '' }}
              />
            </div>
            <div className="code-block" style={{ marginTop: 16 }}>
              <span className="dim">name,wallet</span>{'\n'}
              m.ellington,0x7F3a4c8B21c9…{'\n'}
              s.okafor,0x2Bd18Fa4E77c…{'\n'}
              l.moreau,0x91Cc03aB4512…
            </div>
            {error && (
              <div className="notice notice-danger" style={{ marginTop: 16 }}>
                <Warning size={14} /><span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          /* ── Manual entry ── */
          <div className="card-body card-stack">
            <div>
              <label className="label" htmlFor="al-cid">
                Extend the existing tree <span className="label-note">— optional</span>
              </label>
              <p className="body" style={{ marginBottom: 9, maxWidth: 560 }}>
                Load your current proof set from IPFS so new rows are appended instead of replacing everyone
                already allowlisted.
              </p>
              <div className="row row-wrap" style={{ maxWidth: 520 }}>
                <div className="input-shell" style={{ flex: 1 }}>
                  <input id="al-cid" value={cidInput} onChange={(e) => setCidInput(e.target.value)}
                    placeholder="bafybe…" style={{ fontSize: 13 }} />
                </div>
                <button className="btn" onClick={loadFromIpfs} disabled={!cidInput.trim() || loadingCid}>
                  {loadingCid ? 'Loading…' : 'Load'}
                </button>
                {saved?.cid && (
                  <button className="btn" onClick={() => { setCidInput(saved.cid); loadCid(saved.cid) }} disabled={loadingCid}>
                    Use live set
                  </button>
                )}
              </div>
              {cidState.text && <div className={`hint ${cidState.tone}`}>{cidState.text}</div>}
            </div>

            <div>
              <div className="row" style={{ alignItems: 'baseline', marginBottom: 9 }}>
                <span className="label" style={{ marginBottom: 0 }}>Allowlist entries</span>
                <span className="mono-note" style={{ marginLeft: 'auto' }}>
                  {num(validRows.length)} valid · {num(rows.length)} rows
                  {invalidCount > 0 && <span style={{ color: 'var(--danger)' }}> · {invalidCount} invalid</span>}
                </span>
              </div>

              <div className="tbl">
                <div className="tbl-head" style={{ gridTemplateColumns: '1fr 1.5fr 34px', gap: 10 }}>
                  <span>NAME</span><span>WALLET</span><span />
                </div>
                <div className="tbl-scroll">
                  {rows.map((r, i) => {
                    const walletBad = r.wallet.trim() && !isAddress(r.wallet.trim())
                    return (
                      <div key={i} className="tbl-row" style={{ gridTemplateColumns: '1fr 1.5fr 34px', gap: 10, padding: '8px 14px' }}>
                        <input
                          className="input-row"
                          placeholder="m.ellington"
                          value={r.name}
                          onChange={(e) => setRows(rows.map((x, n) => n === i ? { ...x, name: e.target.value } : x))}
                        />
                        <input
                          className={`input-row${walletBad ? ' is-invalid' : ''}`}
                          placeholder="0x…"
                          value={r.wallet}
                          onChange={(e) => setRows(rows.map((x, n) => n === i ? { ...x, wallet: e.target.value } : x))}
                        />
                        <button
                          className="icon-btn"
                          onClick={() => setRows(rows.length === 1 ? [{ name: '', wallet: '' }] : rows.filter((_, n) => n !== i))}
                          title="Remove row"
                          aria-label={`Remove row ${i + 1}`}
                        >
                          <Close size={11} />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <button
                  onClick={() => setRows([...rows, { name: '', wallet: '' }])}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 7, padding: 11, background: 'var(--surface-2)',
                    font: '500 12.5px/1 var(--f-sans)', color: 'var(--accent)',
                  }}
                >
                  <Plus size={12} />Add row
                </button>
              </div>
            </div>

            {error && (
              <div className="notice notice-danger"><Warning size={14} /><span>{error}</span></div>
            )}

            <div className="row row-wrap">
              <button className="btn btn-accent" onClick={buildAndPin} disabled={validRows.length === 0 || !!building}>
                {building ? <><span className="spinner" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />{building}</>
                  : <>Build tree, pin &amp; review<ArrowRight size={13} /></>}
              </button>
              <span className="mono-note">keccak256(wallet, nameHash) · computed in your browser</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Claim link ── */}
      {(linkCid || (hasRoot && proofState !== 'idle')) && (
        <div className="card mt-20">
          <div className="card-head">
            Claim link
            <span className="head-meta">
              {linkCid ? `${num(staged?.entries.length ?? saved?.total ?? 0)} allowlisted` : 'this is the page you send clients'}
            </span>
          </div>

          {linkCid ? (
            <div className="card-body row row-wrap" style={{ gap: 12 }}>
              <span className="claim-url">{claimUrl(projectId, linkCid)}</span>
              <button className="btn btn-ink" onClick={() => copyClaimLink(linkCid)}>
                {copied ? <><Check size={13} />Copied</> : <><Copy size={13} />Copy link</>}
              </button>
              <a className="btn" href={claimUrl(projectId, linkCid)} target="_blank" rel="noreferrer">
                Open claim page
              </a>
            </div>
          ) : proofState === 'loading' ? (
            <div className="card-body row"><span className="spinner" /><span className="mono-note">Locating the proof set…</span></div>
          ) : (
            <div className="card-body">
              <div className="notice notice-warn">
                <Warning size={14} />
                <span>
                  {proofState === 'error'
                    ? proofError
                    : 'No pinned proof set matches the root this project is enforcing, so the claim link cannot be rebuilt. Re-publish the allowlist below, or paste the CID under “Extend the existing tree” to restore it.'}
                </span>
              </div>
            </div>
          )}

          {(staged || saved?.source === 'local-unverified') && (
            <div className="card-foot">
              <span className="mono-note">
                {staged
                  ? 'This link only works once the staged root is confirmed onchain.'
                  : 'This CID came from local storage and could not be verified against the live root.'}
              </span>
            </div>
          )}
        </div>
      )}

      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        title="Publish Merkle root"
        summary={`Opens claiming for ${num(staged?.entries.length ?? 0)} allowlisted clients.`}
        rows={[
          { k: 'Current root', v: hasRoot ? shortHash(project.merkleRoot, 8, 6) : 'not set' },
          { k: 'New root',     v: staged ? shortHash(staged.root, 8, 6) : '—', tone: 'accent' },
          { k: 'Entries',      v: `${project.allowlisted != null ? num(project.allowlisted) : 0} → ${num(staged?.entries.length ?? 0)}` },
          { k: 'Proof set',    v: staged ? `${staged.cid.slice(0, 12)}…` : '—' },
        ]}
        fn="updateMerkleRoot(uint256,bytes32,uint256)"
        ctaLabel="Sign in wallet"
        onSign={sign}
        onDone={() => {
          if (staged) {
            saveAllowlist(projectId, staged.cid, staged.entries.length, staged.root)
            setSaved({ cid: staged.cid, total: staged.entries.length, root: staged.root, source: 'local' })
          }
          setStaged(null)
          refresh()
        }}
      />
    </div>
  )
}
