import { useEffect, useState } from 'react'
import { RWAID_ADDRESS } from '../../lib/contracts'
import { explorerAddress, explorerTx } from '../../lib/chain'
import { fetchActivity } from '../../lib/useProjects'
import { claimUrl } from '../../lib/allowlistStore'
import { useProofSet } from '../../lib/useProofSet'
import { num, pct, relativeTime, shortAddress, shortHash, treasuryPercent, usd, ZERO_ROOT } from '../../lib/format'

export default function OverviewScreen({ project, projectId, go, protocolFeePercent }) {
  const [activity, setActivity] = useState(null)
  const [activityError, setActivityError] = useState('')
  const [copied, setCopied] = useState(false)
  const { proofSet: saved, state: proofState } = useProofSet(project, projectId)

  useEffect(() => {
    let cancelled = false
    fetchActivity(projectId)
      .then(rows => { if (!cancelled) setActivity(rows) })
      .catch(err => { if (!cancelled) { setActivity([]); setActivityError(err.message || 'Could not read contract events.') } })
    return () => { cancelled = true }
    // totalClaimed: a background project refresh that sees a new claim re-reads the feed too.
  }, [projectId, project.totalClaimed])

  const claimed = Number(project.totalClaimed)
  const allowlisted = project.allowlisted
  const share = pct(claimed, allowlisted)
  const unclaimed = allowlisted != null ? Math.max(allowlisted - claimed, 0) : null
  const hasRoot = project.merkleRoot && project.merkleRoot !== ZERO_ROOT
  const fee = project.effectiveFee
  const sponsoredClaims = fee > 0n ? project.sponsorBalance / fee : 0n
  const link = saved?.cid ? claimUrl(projectId, saved.cid) : null

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* link is visible */ }
  }

  return (
    <div>
      {!hasRoot && (
        <div className="notice warn" style={{ marginBottom: 20 }}>
          <span className="n-icon">!</span>
          <span style={{ flex: 1 }}>No allowlist is published yet, so nobody can claim a name under this namespace.</span>
          <button className="btn btn-sm btn-ink" onClick={() => go('allowlist')}>Publish one</button>
        </div>
      )}

      <div className="tiles">
        <div className="tile ink">
          <span className="label">Identities claimed</span><b>{num(claimed)}</b>
          <span className="meta">{share != null ? `${share}% of allowlist` : 'no allowlist yet'}</span>
        </div>
        <div className="tile">
          <span className="label">Allowlisted</span><b>{allowlisted != null ? num(allowlisted) : '—'}</b>
          <span className="meta">{project.rootUpdates ? `${project.rootUpdates} root update${project.rootUpdates === 1 ? '' : 's'}` : 'never published'}</span>
        </div>
        <div className="tile lime">
          <span className="label">Revenue</span><b>{usd(project.treasuryRevenue)}</b>
          <span className="meta">USDG · your {treasuryPercent(protocolFeePercent)}% share</span>
        </div>
        <div className="tile">
          <span className="label">Claim fee</span><b>{usd(fee)}</b>
          <span className="meta">{project.sponsorBalance > 0n ? `${num(sponsoredClaims)} sponsored left` : 'per identity'}</span>
        </div>
      </div>

      <div className="grid grid-side">
        <div className="stack">
          <div className="card">
            <div className="card-head">Claim funnel<span className="meta">since first root</span></div>
            <div className="card-body" style={{ gap: 16 }}>
              {allowlisted == null ? (
                <p className="body">{hasRoot ? 'A root is live, but the allowlist size could not be read from contract events. Refresh to retry.' : 'Publish an allowlist to see how many of your clients have claimed.'}</p>
              ) : (
                <>
                  <div><div className="funnel-row"><span>Allowlisted</span><span>{num(allowlisted)}</span></div><span className="bar"><span style={{ width: '100%', background: 'var(--ink)' }} /></span></div>
                  <div><div className="funnel-row"><span>Claimed</span><span>{num(claimed)} · {share}%</span></div><span className="bar"><span style={{ width: `${Math.min(share, 100)}%`, background: 'var(--lime)' }} /></span></div>
                  <div><div className="funnel-row"><span>Still to claim</span><span>{num(unclaimed)}</span></div><span className="bar"><span style={{ width: `${Math.max(100 - share, 0)}%`, background: 'var(--orange)' }} /></span></div>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">Recent activity<span className="meta">from contract events</span></div>
            {activity === null ? (
              <div className="card-body"><div className="row"><span className="spinner" /><span className="meta">Scanning logs…</span></div></div>
            ) : activityError ? (
              <div className="card-body"><div className="notice warn"><span className="n-icon">!</span><span>Could not read contract events, so this feed is incomplete. {activityError}</span></div></div>
            ) : activity.length === 0 ? (
              <div className="card-body"><p className="body">No on-chain activity for this project yet.</p></div>
            ) : activity.map(a => (
              <div key={`${a.hash}-${a.kind}-${a.tokenId ?? a.total}`} className="act">
                <span className="t">{a.timestamp ? relativeTime(a.timestamp).replace(' ago', '') : `#${a.block}`}</span>
                <span className={`node ${a.kind === 'claim' ? 'lime' : a.kind === 'root' ? 'orange' : 'ink'}`} />
                <span className="what">
                  {a.kind === 'claim' ? <><b>{a.label ? `${a.label}.${project.slug}.rwa-id.eth` : `Token #${a.tokenId}`}</b><small>{shortAddress(a.claimer)} · fee {usd(a.feePaid)}</small></>
                    : a.kind === 'root' ? <><b>Allowlist published</b><small>{num(a.total)} entries</small></>
                    : <><b>Identity revoked</b><small>token #{a.tokenId} burned</small></>}
                </span>
                <a href={explorerTx(a.hash)} target="_blank" rel="noreferrer">{shortHash(a.hash, 6, 4)}</a>
              </div>
            ))}
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">Configuration</div>
            <div className="kv" style={{ padding: '4px 20px 10px' }}>
              <div className="kv-row"><span>Treasury</span><a href={explorerAddress(project.treasury)} target="_blank" rel="noreferrer">{shortAddress(project.treasury)}</a></div>
              <div className="kv-row"><span>Allowlist root</span><span>{shortHash(project.merkleRoot, 8, 6)}</span></div>
              <div className="kv-row"><span>Proof set (IPFS)</span>
                {saved?.cid ? <a href={`https://ipfs.onchain-id.id/ipfs/${saved.cid}`} target="_blank" rel="noreferrer">{saved.cid.slice(0, 10)}…</a>
                  : <span style={{ color: 'var(--faint)' }}>{proofState === 'loading' ? 'locating…' : proofState === 'idle' ? 'none published' : 'none matches root'}</span>}
              </div>
              <div className="kv-row"><span>Sponsor pool</span><span>{usd(project.sponsorBalance)} USDG</span></div>
              <div className="kv-row"><span>Default policy</span><span>{project.transferable ? 'Transferable' : 'Soulbound'}</span></div>
              <div className="kv-row"><span>Artwork</span><span>{project.image ? 'Your image' : 'RWA ID card'}</span></div>
              <div className="kv-row"><span>Registry</span><a href={explorerAddress(RWAID_ADDRESS)} target="_blank" rel="noreferrer">RWAIDv4 · Robinhood</a></div>
            </div>
          </div>

          <div className="card ink">
            <div className="card-head">Claim link<span className="meta">send this to clients</span></div>
            <div className="card-body">
              {link ? (
                <>
                  <span className="claim-link">{link}</span>
                  <div className="row">
                    <button className="btn btn-lime btn-sm" onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
                    <a className="btn btn-ghost-ink btn-sm" href={link} target="_blank" rel="noreferrer">Open ↗</a>
                  </div>
                </>
              ) : (
                <span className="note" style={{ color: 'var(--steel)' }}>
                  {proofState === 'loading' ? 'Locating the proof set…' : 'Publish an allowlist to get the link your clients claim with.'}
                </span>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">Next actions</div>
            <div style={{ padding: 8 }}>
              <button className="next-item" onClick={() => go('allowlist')}>
                <span className="sq" style={{ background: 'var(--lime)' }}>→</span>
                <span><b>{hasRoot ? 'Update the allowlist' : 'Publish your first allowlist'}</b><small>{allowlisted != null ? `${num(allowlisted)} entries live` : 'CSV or manual entry'}</small></span>
              </button>
              <button className="next-item" onClick={() => go('sponsor')}>
                <span className="sq" style={{ background: '#fff' }}>→</span>
                <span><b>Sponsor your clients’ claims</b><small>pool holds {usd(project.sponsorBalance)}</small></span>
              </button>
              <button className="next-item" onClick={() => go('artwork')}>
                <span className="sq" style={{ background: 'var(--orange)' }}>→</span>
                <span><b>{project.image ? 'Change your NFT artwork' : 'Add your NFT artwork'}</b><small>shown on OpenSea for every name</small></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
