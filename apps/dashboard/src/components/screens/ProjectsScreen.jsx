import { effectiveFee, initials, num, pct, tint, treasuryPercent, usd, usdCompact, ZERO_ROOT } from '../../lib/format'
import { ChevronRight, Plus, Warning } from '../icons'

const COLS = '2.1fr 1fr 1.5fr 1fr .8fr .9fr 30px'

function needsReview(p) {
  return !p.active || !p.merkleRoot || p.merkleRoot === ZERO_ROOT
}

export default function ProjectsScreen({ projects, loading, error, go, onRetry, protocolFeePercent }) {
  const totalClaimed = projects.reduce((a, p) => a + Number(p.totalClaimed), 0)
  const totalAllow   = projects.reduce((a, p) => a + (p.allowlisted ?? 0), 0)
  const totalRevenue = projects.reduce((a, p) => a + p.treasuryRevenue, 0n)
  const yourShare    = treasuryPercent(protocolFeePercent)
  const attention    = projects.filter(needsReview).length
  const rate         = pct(totalClaimed, totalAllow)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="screen-title" style={{ marginBottom: 7 }}>Projects</h1>
          <p className="screen-sub">
            Namespaces you administer under <span className="code-inline" style={{ color: 'var(--ink-2)' }}>*.rwa-id.eth</span>
          </p>
        </div>
        <button className="btn btn-ink" onClick={() => go('create', null)}>
          <Plus size={13} />New project
        </button>
      </div>

      {!loading && !error && projects.length > 0 && (
        <div className="stat-strip" style={{ marginBottom: 20 }}>
          <div className="stat">
            <div className="stat-label">Total identities</div>
            <div className="stat-value">{num(totalClaimed)}</div>
            <div className="stat-meta">across {projects.length} project{projects.length === 1 ? '' : 's'}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Allowlisted</div>
            <div className="stat-value">{totalAllow ? num(totalAllow) : '—'}</div>
            <div className="stat-meta">{rate != null ? `${rate}% claim rate` : 'no root published yet'}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Revenue to treasury</div>
            <div className="stat-value good">{usdCompact(totalRevenue)}</div>
            <div className="stat-meta">USDC · lifetime · your {yourShare}% share</div>
          </div>
          <div className="stat">
            <div className="stat-label">Needs review</div>
            <div className={`stat-value${attention ? ' warn' : ''}`}>{attention}</div>
            <div className="stat-meta">paused or no root set</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="state-block">
          <span className="spinner lg" style={{ margin: '0 auto 14px' }} />
          <div className="mono-note">Reading projects from Ethereum mainnet…</div>
        </div>
      ) : error ? (
        <div className="state-block">
          <div className="state-title">Could not read the registry</div>
          <p className="state-desc">{error}</p>
          <button className="btn" onClick={onRetry}>Try again</button>
        </div>
      ) : projects.length === 0 ? (
        <div className="state-block">
          <div className="state-title">No namespaces yet</div>
          <p className="state-desc">
            Register a namespace to start issuing identities under <span className="code-inline">*.rwa-id.eth</span>.
            The namespace itself is free — you only pay gas.
          </p>
          <button className="btn btn-ink" onClick={() => go('create', null)}>
            <Plus size={13} />Register a namespace
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="tbl-head proj-row" style={{ gridTemplateColumns: COLS, padding: '11px 20px', borderRadius: 0 }}>
            <span>NAMESPACE</span>
            <span>STATUS</span>
            <span>CLAIM PROGRESS</span>
            <span style={{ textAlign: 'right' }}>REVENUE</span>
            <span style={{ textAlign: 'right' }}>FEE</span>
            <span style={{ textAlign: 'right' }}>POLICY</span>
            <span />
          </div>

          {projects.map((p) => {
            const claimed = Number(p.totalClaimed)
            const share   = pct(claimed, p.allowlisted)
            return (
              <button
                key={p.id}
                className="proj-row proj-row-btn"
                style={{ gridTemplateColumns: COLS }}
                onClick={() => go('overview', p.id)}
              >
                <span className="row" style={{ gap: 9, minWidth: 0 }}>
                  <span className="proj-initials" style={{ background: tint(p.id) }}>{initials(p.slug)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="proj-name">{p.slug}</span>
                    <span className="proj-sub">{p.slug}.rwa-id.eth · #{p.id}</span>
                  </span>
                </span>

                <span>
                  <span className={`pill ${p.active ? 'pill-good' : 'pill-warn'}`}>
                    <span className="dot" />{p.active ? 'Active' : 'Paused'}
                  </span>
                </span>

                <span>
                  <span className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                      {num(claimed)} / {p.allowlisted != null ? num(p.allowlisted) : '—'}
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--mute-3)' }}>
                      {share != null ? `${share}%` : '—'}
                    </span>
                  </span>
                  <span className="meter sm"><span style={{ width: `${Math.min(share ?? 0, 100)}%` }} /></span>
                </span>

                <span style={{ textAlign: 'right', font: '500 13.5px/1 var(--f-sans)' }}>
                  {usdCompact(p.treasuryRevenue)}
                </span>
                <span style={{ textAlign: 'right', font: '400 12.5px/1 var(--f-mono)', color: 'var(--ink-2)' }}>
                  {usd(effectiveFee(p))}
                </span>
                <span style={{ textAlign: 'right', font: '400 11.5px/1 var(--f-mono)', color: 'var(--mute-2)' }}>
                  {p.transferable ? 'Transferable' : 'Soulbound'}
                </span>
                <span style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--faint-2)' }}>
                  <ChevronRight size={14} />
                </span>
              </button>
            )
          })}

          <div className="card-foot">
            <span className="mono-note">Owner-filtered from onchain state · no indexer</span>
            <button className="link-btn" style={{ marginLeft: 'auto' }} onClick={() => go('create', null)}>
              Register another namespace
            </button>
          </div>
        </div>
      )}

      {!loading && attention > 0 && (
        <div className="notice notice-warn" style={{ marginTop: 20 }}>
          <Warning size={15} />
          <span>
            {attention === 1 ? '1 project needs' : `${attention} projects need`} attention — either claiming
            is paused or no Merkle root has been published, so no client can claim yet.
          </span>
        </div>
      )}
    </div>
  )
}
