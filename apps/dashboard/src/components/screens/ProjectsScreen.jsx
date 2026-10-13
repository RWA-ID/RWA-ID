import { initials, num, pct, usd, usdCompact } from '../../lib/format'

export default function ProjectsScreen({ projects, loading, error, go, onRetry }) {
  return (
    <div>
      <div className="page-head">
        <div>
          <span className="kicker">Console</span>
          <h1 className="display">Your namespaces</h1>
        </div>
        <button className="btn btn-lime" onClick={() => go('create', null)}>+ Register a namespace</button>
      </div>

      {error && (
        <div className="notice danger" style={{ marginBottom: 20 }}>
          <span className="n-icon">!</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button className="btn btn-sm" onClick={onRetry}>Retry</button>
        </div>
      )}

      {loading && projects.length === 0 ? (
        <div className="row"><span className="spinner" /><span className="meta">Reading your namespaces from Robinhood Chain…</span></div>
      ) : (
        <div className="proj-grid">
          {projects.map(p => {
            const share = pct(Number(p.totalClaimed), p.allowlisted)
            return (
              <button key={p.id} className="proj-card" onClick={() => go('overview', p.id)}>
                <span className="head">
                  <span className="initials">{initials(p.slug)}</span>
                  <span className="name"><b>{p.slug}</b><span className="meta">{p.slug}.rwa-id.eth · #{p.id}</span></span>
                  <span className={`pill ${p.active ? 'lime' : 'orange'}`}>{p.active ? 'Active' : 'Paused'}</span>
                </span>
                <span className="stats">
                  <span><span className="label">Claimed</span><b>{num(p.totalClaimed)}</b></span>
                  <span><span className="label">Revenue</span><b>{usdCompact(p.treasuryRevenue)}</b></span>
                  <span><span className="label">Fee</span><b>{usd(p.effectiveFee)}</b></span>
                </span>
                <span className="bar thin" style={{ width: '100%' }}>
                  <span style={{ width: `${Math.min(share ?? 0, 100)}%`, background: 'var(--lime)', boxShadow: 'inset 0 0 0 1.5px var(--ink)' }} />
                </span>
              </button>
            )
          })}
          <button className="proj-add" onClick={() => go('create', null)}>
            <span className="plus">+</span>
            <b style={{ fontSize: 18 }}>Register a namespace</b>
            <span className="note">Free to create on Robinhood Chain</span>
          </button>
        </div>
      )}
    </div>
  )
}
