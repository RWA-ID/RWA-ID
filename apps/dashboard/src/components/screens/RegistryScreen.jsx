import { useEffect, useState } from 'react'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { getLogsChunked } from '../../lib/readClient'
import { IDENTITY_CLAIMED } from '../../lib/useProjects'
import { useLookup } from '../../lib/useLookup'
import { num, shortAddress, usd } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'
import { Check, Close, Search, Warning } from '../icons'

export default function RegistryScreen({ project, projectId, refresh }) {
  const [query, setQuery]   = useState('')
  const [drawer, setDrawer] = useState(false)
  const [claims, setClaims] = useState(null)
  const { result, loading, error, lookup, reset } = useLookup(projectId)
  const tx = useTx()

  useEffect(() => {
    let cancelled = false
    setClaims(null)
    getLogsChunked({ address: RWAID_ADDRESS, event: IDENTITY_CLAIMED, args: { projectId: BigInt(projectId) } })
      .then(logs => {
        if (cancelled) return
        setClaims(logs.slice(-25).reverse().map(l => ({
          tokenId: l.args.tokenId.toString(),
          claimer: l.args.claimer,
          feePaid: l.args.feePaid,
          hash: l.transactionHash,
        })))
      })
      .catch(() => { if (!cancelled) setClaims([]) })
    return () => { cancelled = true }
  }, [projectId])

  const canRevoke = result?.isClaimed && !result.isRevoked && result.tokenId !== '0'

  const sign = () => {
    tx.writeContract({
      address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'revokeIdentity',
      args: [BigInt(projectId), BigInt(result.tokenId)],
    })
  }

  const statusLabel = !result ? '' : result.isRevoked ? 'Revoked' : result.isClaimed ? 'Claimed' : 'Unclaimed'
  const statusTone  = !result ? '' : result.isRevoked ? 'danger' : result.isClaimed ? 'good' : ''

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="screen-title" style={{ marginBottom: 7 }}>Registry &amp; revocation</h1>
        <p className="screen-sub maxw-640">
          Look up any name directly onchain — no event log scanning. Revocation is permanent, so it lives
          behind the lookup.
        </p>
      </div>

      <div className="card mb-24">
        <div className="card-body">
          <label className="label" htmlFor="rg-q">Identity name</label>
          <form
            className="row row-wrap"
            onSubmit={(e) => { e.preventDefault(); lookup(query) }}
          >
            <div className="input-shell" style={{ flex: 1, maxWidth: 440 }}>
              <input
                id="rg-q"
                value={query}
                onChange={(e) => { setQuery(e.target.value); reset() }}
                placeholder="m.ellington"
                autoComplete="off"
                spellCheck="false"
              />
              <span className="affix">.{project.slug}.rwa-id.eth</span>
            </div>
            <button className="btn btn-ink" type="submit" disabled={!query.trim() || loading}>
              {loading ? 'Looking up…' : <><Search size={13} />Look up</>}
            </button>
          </form>
          <div className="hint">
            hashes the name, then multicalls nameNodeFromHash · nodeToTokenId · nodeClaimed · revoked
          </div>
          {error && (
            <div className="notice notice-danger" style={{ marginTop: 14 }}>
              <Warning size={14} /><span>{error}</span>
            </div>
          )}
        </div>

        {result && (
          <div style={{ borderTop: '1px solid var(--hairline-faint)', padding: 20, background: 'var(--surface-2)' }}>
            <div className="row" style={{ gap: 14, marginBottom: 16 }}>
              <span className="lookup-mark" style={{
                background: result.isRevoked ? 'var(--danger)' : result.isClaimed ? 'var(--good)' : 'var(--faint)',
              }}>
                {result.isRevoked ? <Close size={17} width={2} /> : result.isClaimed ? <Check size={17} /> : <Search size={16} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 15.5px/1.3 var(--f-sans)', letterSpacing: '-.01em', overflowWrap: 'anywhere' }}>
                  {result.name}.{project.slug}.rwa-id.eth
                </div>
                <div className="mono-note">
                  {result.isRevoked
                    ? 'burned and blacklisted — this name can never be claimed again'
                    : result.isClaimed
                      ? `token #${result.tokenId} · ${project.transferable ? 'transferable' : 'soulbound'}`
                      : 'no identity has been claimed under this name'}
                </div>
              </div>
              <button className="link-btn" style={{ color: 'var(--mute-3)' }} onClick={() => { reset(); setQuery('') }}>
                Clear
              </button>
            </div>

            <div className="stat-strip" style={{ '--cols': 4 }}>
              <div className="stat" style={{ padding: '13px 15px' }}>
                <div className="stat-label" style={{ marginBottom: 7 }}>Status</div>
                <div className={`stat-value sm ${statusTone}`} style={{ fontSize: 13, fontWeight: 500 }}>{statusLabel}</div>
              </div>
              <div className="stat" style={{ padding: '13px 15px' }}>
                <div className="stat-label" style={{ marginBottom: 7 }}>Token ID</div>
                <div className="stat-value data">{result.tokenId !== '0' ? result.tokenId : '—'}</div>
              </div>
              <div className="stat" style={{ padding: '13px 15px' }}>
                <div className="stat-label" style={{ marginBottom: 7 }}>Resolves to</div>
                <div className="stat-value data">{result.holder ? shortAddress(result.holder) : '—'}</div>
              </div>
              <div className="stat" style={{ padding: '13px 15px' }}>
                <div className="stat-label" style={{ marginBottom: 7 }}>Revoked</div>
                <div className="stat-value data">{result.isRevoked ? 'yes' : 'no'}</div>
              </div>
            </div>

            {canRevoke && (
              <div className="danger-card card" style={{ marginTop: 16, boxShadow: 'none' }}>
                <div className="card-body">
                  <div style={{ font: '600 13.5px/1.3 var(--f-sans)', color: 'var(--danger-ink)', marginBottom: 7 }}>
                    Revoke this identity
                  </div>
                  <div style={{ font: '400 12.5px/1.55 var(--f-sans)', color: 'var(--danger-ink)', marginBottom: 14, maxWidth: 620, textWrap: 'pretty' }}>
                    Burns token #{result.tokenId}, clears ENS resolution to address(0), and blacklists the name
                    permanently under this project. Use this for compromised wallets or offboarded clients.
                  </div>
                  <button className="btn btn-danger-ghost" onClick={() => setDrawer(true)}>Review revocation</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          Recently claimed
          <span className="head-meta">{claims ? `${num(claims.length)} shown` : 'reading logs…'}</span>
        </div>
        {claims === null ? (
          <div className="card-body row"><span className="spinner" /><span className="mono-note">Scanning IdentityClaimed logs…</span></div>
        ) : claims.length === 0 ? (
          <div className="card-body"><p className="body">No identities have been claimed under this namespace yet.</p></div>
        ) : (
          <>
            <div className="tbl-head" style={{ gridTemplateColumns: '1fr 1.6fr 1fr 90px', padding: '10px 20px', borderRadius: 0 }}>
              <span>TOKEN</span><span>HOLDER AT CLAIM</span><span>FEE PAID</span><span style={{ textAlign: 'right' }}>TX</span>
            </div>
            {claims.map(c => (
              <div key={c.tokenId} className="tbl-row" style={{ gridTemplateColumns: '1fr 1.6fr 1fr 90px', padding: '12px 20px' }}>
                <span className="mono" style={{ fontSize: 12.5, color: 'var(--ink)' }}>#{c.tokenId}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{shortAddress(c.claimer, 8, 6)}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--mute-3)' }}>{usd(c.feePaid)}</span>
                <a
                  className="mono"
                  style={{ fontSize: 11, textAlign: 'right', color: 'var(--accent)' }}
                  href={`https://etherscan.io/tx/${c.hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  view
                </a>
              </div>
            ))}
          </>
        )}
      </div>

      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        title="Revoke identity"
        summary={`Permanently burns ${result?.name}.${project.slug}.rwa-id.eth.`}
        rows={[
          { k: 'Identity', v: `${result?.name}.${project.slug}.rwa-id.eth` },
          { k: 'Token',    v: `#${result?.tokenId}` },
          { k: 'Holder',   v: result?.holder ? shortAddress(result.holder) : '—' },
          { k: 'Resolves to after', v: 'address(0)', tone: 'danger' },
          { k: 'Re-claimable', v: 'never', tone: 'danger' },
        ]}
        fn="revokeIdentity(uint256,uint256)"
        danger
        confirmWord="REVOKE"
        warning="This burns the token and blacklists the name under this project forever. There is no way to restore it — the client would need a different name."
        ctaLabel="Revoke identity"
        onSign={sign}
        onDone={() => { reset(); setQuery(''); refresh() }}
      />
    </div>
  )
}
