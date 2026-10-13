import { useEffect, useState } from 'react'
import { RWAID_ADDRESS } from '../../lib/contracts'
import { fetchActivity } from '../../lib/useProjects'
import { claimUrl } from '../../lib/allowlistStore'
import { useProofSet } from '../../lib/useProofSet'
import {
  effectiveFee, num, pct, relativeTime, shortAddress, shortHash, treasuryPercent,
  usd, usdCompact, ZERO_ROOT,
} from '../../lib/format'
import { ChevronRight, Coin, Copy, External, List, Search, Warning } from '../icons'

export default function OverviewScreen({ project, projectId, go, protocolFeePercent }) {
  const [activity, setActivity] = useState(null)
  const [activityError, setActivityError] = useState('')
  const [copied, setCopied] = useState(false)
  const { proofSet: saved, state: proofState } = useProofSet(project, projectId)

  useEffect(() => {
    let cancelled = false
    setActivity(null)
    setActivityError('')
    fetchActivity(projectId)
      .then(rows => { if (!cancelled) setActivity(rows) })
      .catch(err => {
        if (cancelled) return
        setActivity([])
        setActivityError(err.message || 'Could not read contract events.')
      })
    return () => { cancelled = true }
  }, [projectId])

  const copyClaim = async () => {
    try {
      await navigator.clipboard.writeText(claimUrl(projectId, saved.cid))
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch { /* clipboard blocked — the link is reachable from the Allowlist screen */ }
  }

  const claimed     = Number(project.totalClaimed)
  const allowlisted = project.allowlisted
  const share       = pct(claimed, allowlisted)
  const unclaimed   = allowlisted != null ? Math.max(allowlisted - claimed, 0) : null
  const hasRoot     = project.merkleRoot && project.merkleRoot !== ZERO_ROOT
  const fee         = effectiveFee(project)

  return (
    <div>
      <div className="page-head start">
        <div>
          <div className="row" style={{ gap: 11, marginBottom: 9 }}>
            <h1 className="screen-title">{project.slug}</h1>
            <span className={`pill ${project.active ? 'pill-good' : 'pill-warn'}`}>
              <span className="dot" />{project.active ? 'Active' : 'Paused'}
            </span>
          </div>
          <div className="row row-wrap" style={{ gap: 12, font: '400 12.5px/1.5 var(--f-mono)', color: 'var(--mute-3)' }}>
            <span>{project.slug}.rwa-id.eth</span>
            <span style={{ color: '#C8C9C5' }}>·</span>
            <span>project #{projectId}</span>
            <span style={{ color: '#C8C9C5' }}>·</span>
            <span>owner {shortAddress(project.owner)}</span>
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => go('registry')}>Look up an identity</button>
          <button className="btn btn-ink" onClick={() => go('allowlist')}>Update allowlist</button>
        </div>
      </div>

      {!hasRoot && (
        <div className="notice notice-warn" style={{ marginBottom: 20 }}>
          <Warning size={15} />
          <span>
            No Merkle root is published yet, so nobody can claim an identity under this namespace.
            Publish an allowlist to open claiming.
          </span>
        </div>
      )}

      <div className="stat-strip" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-label">Identities claimed</div>
          <div className="stat-value">{num(claimed)}</div>
          <div className={`stat-meta${share != null ? ' good' : ''}`}>
            {share != null ? `${share}% of allowlist` : 'no allowlist yet'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Allowlisted</div>
          <div className="stat-value">{allowlisted != null ? num(allowlisted) : '—'}</div>
          <div className="stat-meta">
            {project.rootUpdates ? `${project.rootUpdates} root update${project.rootUpdates === 1 ? '' : 's'}` : 'never published'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Revenue</div>
          <div className="stat-value good">{usdCompact(project.treasuryRevenue)}</div>
          <div className="stat-meta">USDC · your {treasuryPercent(protocolFeePercent)}% share</div>
        </div>
        <div className="stat">
          <div className="stat-label">Claim fee</div>
          <div className="stat-value">{usd(fee)}</div>
          <div className="stat-meta">per identity</div>
        </div>
      </div>

      <div className="grid grid-side start">
        <div className="stack">
          {/* Funnel */}
          <div className="card">
            <div className="card-head">
              Claim funnel
              <span className="head-meta">since first root</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {allowlisted == null ? (
                <p className="body">
                  {hasRoot
                    ? 'A root is live, but the allowlist size could not be read from contract events. Retry from the topbar.'
                    : 'Publish an allowlist to see how many of your clients have claimed.'}
                </p>
              ) : (
                <>
                  <div>
                    <div className="funnel-row"><span>Allowlisted</span><span>{num(allowlisted)}</span></div>
                    <div className="meter"><span className="ink" style={{ width: '100%' }} /></div>
                  </div>
                  <div>
                    <div className="funnel-row"><span>Claimed</span><span>{num(claimed)} · {share}%</span></div>
                    <div className="meter"><span style={{ width: `${Math.min(share, 100)}%` }} /></div>
                  </div>
                  <div>
                    <div className="funnel-row"><span>Still to claim</span><span>{num(unclaimed)}</span></div>
                    <div className="meter">
                      <span style={{ width: `${Math.min(100 - share, 100)}%`, background: 'var(--faint-2)' }} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Activity */}
          <div className="card">
            <div className="card-head">
              Recent activity
              <span className="head-meta">from contract events</span>
            </div>
            {activity === null ? (
              <div className="card-body row"><span className="spinner" /><span className="mono-note">Scanning logs…</span></div>
            ) : activityError ? (
              <div className="card-body">
                <div className="notice notice-warn">
                  <Warning size={14} />
                  <span>Could not read contract events, so this feed is incomplete. {activityError}</span>
                </div>
              </div>
            ) : activity.length === 0 ? (
              <div className="card-body"><p className="body">No onchain activity for this project yet.</p></div>
            ) : (
              activity.map(a => (
                <div key={`${a.hash}-${a.kind}-${a.tokenId ?? a.total}`} className="act-row">
                  <span className="act-time">{a.timestamp ? relativeTime(a.timestamp) : `#${a.block}`}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {a.kind === 'claim' ? (
                      <>
                        <span className="act-title">
                          {a.label ? `${a.label}.${project.slug}.rwa-id.eth` : `Identity claimed — token #${a.tokenId}`}
                        </span>
                        <span className="act-meta">
                          {shortAddress(a.claimer)} · fee {usd(a.feePaid)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="act-title">Merkle root updated</span>
                        <span className="act-meta">{num(a.total)} entries allowlisted</span>
                      </>
                    )}
                  </span>
                  <a
                    className="act-hash"
                    href={`https://etherscan.io/tx/${a.hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortHash(a.hash, 6, 4)}
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="stack">
          {/* Configuration */}
          <div className="card">
            <div className="card-head">Configuration</div>
            <div style={{ padding: '6px 20px 14px' }}>
              <div className="kv-list">
                <div className="kv-row">
                  <span className="kv-key">Treasury</span>
                  <a className="kv-val accent" href={`https://etherscan.io/address/${project.treasury}`} target="_blank" rel="noreferrer">
                    {shortAddress(project.treasury)}
                  </a>
                </div>
                <div className="kv-row">
                  <span className="kv-key">Merkle root</span>
                  <span className="kv-val">{shortHash(project.merkleRoot, 8, 6)}</span>
                </div>
                <div className="kv-row">
                  <span className="kv-key">Proof set (IPFS)</span>
                  {saved?.cid ? (
                    <a className="kv-val accent" href={`https://ipfs.io/ipfs/${saved.cid}`} target="_blank" rel="noreferrer">
                      {saved.cid.slice(0, 10)}…
                    </a>
                  ) : (
                    <span className="kv-val" style={{ color: 'var(--mute-3)' }}>
                      {proofState === 'loading' ? 'locating…'
                        : proofState === 'idle' ? 'no root published'
                        : 'none matches live root'}
                    </span>
                  )}
                </div>
                <div className="kv-row">
                  <span className="kv-key">Default policy</span>
                  <span className="kv-val">{project.transferable ? 'Transferable' : 'Soulbound'}</span>
                </div>
                <div className="kv-row">
                  <span className="kv-key">Registry</span>
                  <a className="kv-val accent" href={`https://etherscan.io/address/${RWAID_ADDRESS}`} target="_blank" rel="noreferrer">
                    {shortAddress(RWAID_ADDRESS)}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Claim link */}
          {saved?.cid && (
            <div className="card">
              <div className="card-head">
                Claim link
                <span className="head-meta">send this to clients</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <span className="claim-url">{claimUrl(projectId, saved.cid)}</span>
                <div className="row row-wrap">
                  <button className="btn btn-ink btn-sm" onClick={copyClaim}>
                    <Copy size={12} />{copied ? 'Copied' : 'Copy link'}
                  </button>
                  <a className="btn btn-sm" href={claimUrl(projectId, saved.cid)} target="_blank" rel="noreferrer">
                    <External size={12} />Open
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Next actions */}
          <div className="card">
            <div className="card-head">Next actions</div>
            <div style={{ padding: 8 }}>
              <button className="action-item" onClick={() => go('allowlist')}>
                <span className="action-icon accent"><List size={13} /></span>
                <span style={{ flex: 1 }}>
                  <span className="action-title">{hasRoot ? 'Update the allowlist' : 'Publish your first allowlist'}</span>
                  <span className="action-sub">{allowlisted != null ? `${num(allowlisted)} entries live` : 'CSV or manual entry'}</span>
                </span>
                <ChevronRight size={13} style={{ color: 'var(--faint-2)' }} />
              </button>
              <button className="action-item" onClick={() => go('registry')}>
                <span className="action-icon"><Search size={13} /></span>
                <span style={{ flex: 1 }}>
                  <span className="action-title">Look up an identity</span>
                  <span className="action-sub">status, token id, holder</span>
                </span>
                <ChevronRight size={13} style={{ color: 'var(--faint-2)' }} />
              </button>
              <button className="action-item" onClick={() => go('fee')}>
                <span className="action-icon"><Coin size={13} /></span>
                <span style={{ flex: 1 }}>
                  <span className="action-title">Adjust the claim fee</span>
                  <span className="action-sub">currently {usd(fee)}</span>
                </span>
                <ChevronRight size={13} style={{ color: 'var(--faint-2)' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
