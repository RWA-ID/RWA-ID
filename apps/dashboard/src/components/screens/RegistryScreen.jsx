import { useEffect, useState } from 'react'
import { RWAID_ADDRESS, RWAID_ABI, IDENTITY_CLAIMED } from '../../lib/contracts'
import { explorerTx, explorerToken } from '../../lib/chain'
import { getLogsChunked } from '../../lib/readClient'
import { useLookup } from '../../lib/useLookup'
import { num, shortAddress, usd } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'

export default function RegistryScreen({ project, projectId, refresh }) {
  const [query, setQuery] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [claims, setClaims] = useState(null)
  const [claimsError, setClaimsError] = useState('')
  const { result, loading, error, lookup, reset } = useLookup(projectId)
  const tx = useTx()

  useEffect(() => {
    let cancelled = false
    getLogsChunked({ address: RWAID_ADDRESS, event: IDENTITY_CLAIMED, args: { projectId: BigInt(projectId) } })
      .then(logs => {
        if (!cancelled) setClaims(logs.slice(-25).reverse().map(l => ({
          tokenId: l.args.tokenId.toString(), claimer: l.args.claimer, feePaid: l.args.feePaid, label: l.args.label, hash: l.transactionHash,
        })))
      })
      .catch(err => { if (!cancelled) { setClaims([]); setClaimsError(err.message) } })
    return () => { cancelled = true }
  }, [projectId])

  const canRevoke = result?.isClaimed && !result.isRevoked && result.tokenId !== '0'
  const full = result ? `${result.name}.${project.slug}.rwa-id.eth` : ''
  const status = !result ? '' : result.isRevoked ? 'Revoked' : result.isClaimed ? 'Claimed' : 'Unclaimed'

  return (
    <div className="stack">
      <div className="grid grid-2">
        <div className="card card-pad">
          <span className="card-title">Look up an identity</span>
          <form onSubmit={(e) => { e.preventDefault(); setConfirm(false); lookup(query) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 58, padding: '0 6px 0 18px', borderRadius: 999, boxShadow: 'var(--ring-lime)' }}>
            <input value={query} onChange={(e) => { setQuery(e.target.value); reset(); setConfirm(false) }} placeholder="joe" aria-label="Name to look up" spellCheck="false"
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 20, fontWeight: 800 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--placeholder)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>.{project.slug}.rwa-id.eth</span>
            <button className="btn btn-ink" style={{ color: 'var(--lime)' }} type="submit" disabled={!query.trim() || loading}>{loading ? '…' : 'Look up'}</button>
          </form>
          {error && <span className="hint bad">{error}</span>}
          {result && (
            <div className="kv well">
              <div className="kv-row"><span>Name</span><span>{full}</span></div>
              <div className="kv-row"><span>Status</span><span style={{ color: result.isRevoked ? 'var(--orange-deep)' : result.isClaimed ? 'var(--lime-deep)' : undefined }}>{status}</span></div>
              <div className="kv-row"><span>Token</span>{result.tokenId !== '0' && !result.isRevoked ? <a href={explorerToken(RWAID_ADDRESS, result.tokenId)} target="_blank" rel="noreferrer">#{result.tokenId}</a> : <span>—</span>}</div>
              <div className="kv-row"><span>Holder</span><span>{result.holder ? shortAddress(result.holder) : '—'}</span></div>
              <div className="kv-row"><span>Transferability</span><span>{result.transferable == null ? '—' : result.transferable ? 'Transferable' : 'Soulbound'}</span></div>
            </div>
          )}
        </div>

        <div className="card ring-orange card-pad">
          <span className="card-title">Revoke identity</span>
          <span className="note">Burns the token, clears its resolution, and blacklists the name under this project forever. This cannot be undone.</span>
          {canRevoke ? (
            <>
              <button type="button" className={`check danger${confirm ? ' on' : ''}`} onClick={() => setConfirm(c => !c)}>
                <span className="box">{confirm ? '✓' : ''}</span>I understand {full} can never be re-claimed.
              </button>
              <button className="btn btn-orange" style={{ alignSelf: 'flex-start' }} disabled={!confirm} onClick={() => setDrawer(true)}>Revoke permanently</button>
            </>
          ) : (
            <span className="meta">Look up a claimed name to revoke it.</span>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">Recently claimed<span className="meta">{claims ? `${num(claims.length)} shown` : 'reading logs…'}</span></div>
        {claims === null ? (
          <div className="card-body"><div className="row"><span className="spinner" /><span className="meta">Scanning claims…</span></div></div>
        ) : claims.length === 0 ? (
          <div className="card-body"><p className="body">{claimsError || 'No identities have been claimed under this namespace yet.'}</p></div>
        ) : (
          <div className="tbl" style={{ borderRadius: 0, boxShadow: 'none' }}>
            <div className="tbl-head reg-grid"><span>Name</span><span>Token</span><span className="sm-hide">Holder at claim</span><span className="sm-hide">Fee</span><span>Tx</span></div>
            {claims.map(c => (
              <div key={c.tokenId} className="tbl-row reg-grid">
                <b>{c.label}</b><span>#{c.tokenId}</span><span className="sm-hide" style={{ color: 'var(--muted)' }}>{shortAddress(c.claimer)}</span>
                <span className="sm-hide">{usd(c.feePaid)}</span><a href={explorerTx(c.hash)} target="_blank" rel="noreferrer" style={{ color: 'var(--orange-deep)' }}>view</a>
              </div>
            ))}
          </div>
        )}
      </div>

      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        title="Revoke identity"
        summary={`Permanently burns ${full}.`}
        rows={[
          { k: 'Identity', v: full }, { k: 'Token', v: `#${result?.tokenId}` },
          { k: 'Holder', v: result?.holder ? shortAddress(result.holder) : '—' },
          { k: 'Resolves to after', v: 'nothing', tone: 'danger' }, { k: 'Re-claimable', v: 'never', tone: 'danger' },
        ]}
        fn="revokeIdentity(uint256,uint256)"
        danger
        confirmWord="REVOKE"
        warning="This burns the token and blacklists the name under this project forever. The client would need a different name."
        ctaLabel="Revoke identity"
        onSign={() => tx.writeContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'revokeIdentity', args: [BigInt(projectId), BigInt(result.tokenId)] })}
        onDone={() => { reset(); setQuery(''); setConfirm(false); refresh() }}
      />
    </div>
  )
}
