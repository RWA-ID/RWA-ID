import { useState } from 'react'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { useLookup } from '../../lib/useLookup'
import { shortAddress } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'
import { Search, Warning } from '../icons'

export default function TransferabilityScreen({ project, projectId, refresh }) {
  const [choice, setChoice] = useState(project.transferable)
  const [query, setQuery]   = useState('')
  const [tokenDrawer, setTokenDrawer]     = useState(false)
  const [projectDrawer, setProjectDrawer] = useState(false)

  const { result, loading, error, lookup, reset } = useLookup(projectId)
  const projectTx = useTx()
  const tokenTx   = useTx()

  const changed = choice !== project.transferable
  // Per-token state is not exposed by the ABI, so we offer the flip against the
  // project default and let the contract be the source of truth.
  const [tokenTransferable, setTokenTransferable] = useState(true)
  const canOverride = result?.isClaimed && !result.isRevoked && result.tokenId !== '0'

  const signProject = () => {
    projectTx.writeContract({
      address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'setProjectTransferable',
      args: [BigInt(projectId), choice],
    })
  }

  const signToken = () => {
    tokenTx.writeContract({
      address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'setTokenTransferable',
      args: [BigInt(result.tokenId), tokenTransferable],
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="screen-title" style={{ marginBottom: 7 }}>Transferability</h1>
        <p className="screen-sub maxw-640">
          Soulbound identities stay with the wallet that passed your KYC. Set a project default for new
          mints, or override a single token.
        </p>
      </div>

      <div className="grid grid-2 start">
        {/* ── Project default ── */}
        <div className="card">
          <div className="card-head">Project default</div>
          <div className="card-body card-stack">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className={`radio-card${!choice ? ' is-active' : ''}`} onClick={() => setChoice(false)}>
                <span className="radio-card-head">
                  <span className="radio-dot" />
                  <span className="radio-card-title">Soulbound</span>
                  {!project.transferable && <span className="badge-advised">CURRENT</span>}
                </span>
                <span className="radio-card-desc">
                  Non-transferable. Recommended for KYC-bound client identities.
                </span>
              </button>
              <button className={`radio-card${choice ? ' is-active' : ''}`} onClick={() => setChoice(true)}>
                <span className="radio-card-head">
                  <span className="radio-dot" />
                  <span className="radio-card-title">Transferable</span>
                  {project.transferable && <span className="badge-advised">CURRENT</span>}
                </span>
                <span className="radio-card-desc">
                  Standard ERC-721 behaviour for newly minted identities.
                </span>
              </button>
            </div>

            <div className="mono-note">Already-minted tokens keep their current setting.</div>

            <div>
              <button className="btn btn-ink" disabled={!changed} onClick={() => setProjectDrawer(true)}>
                Review change of default
              </button>
            </div>
          </div>
        </div>

        {/* ── Per-token override ── */}
        <div className="card">
          <div className="card-head">Per-token override</div>
          <div className="card-body card-stack">
            <div className="field">
              <label className="label" htmlFor="xf-q">Find the identity</label>
              <form className="row" onSubmit={(e) => { e.preventDefault(); lookup(query) }}>
                <div className="input-shell" style={{ flex: 1 }}>
                  <input id="xf-q" value={query} onChange={(e) => { setQuery(e.target.value); reset() }}
                    placeholder="m.ellington" autoComplete="off" spellCheck="false" style={{ fontSize: 13.5 }} />
                  <span className="affix">.{project.slug}</span>
                </div>
                <button className="btn" type="submit" disabled={!query.trim() || loading}>
                  {loading ? '…' : <Search size={13} />}
                </button>
              </form>
              {error && <div className="hint hint-danger">{error}</div>}
            </div>

            {result && (
              <div className="compare-cell" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="kv-row" style={{ padding: 0, border: 0 }}>
                  <span className="kv-key">Token</span>
                  <span className="kv-val">{result.tokenId !== '0' ? `#${result.tokenId}` : '—'}</span>
                </div>
                <div className="kv-row" style={{ padding: 0, border: 0 }}>
                  <span className="kv-key">Holder</span>
                  <span className="kv-val">{result.holder ? shortAddress(result.holder) : '—'}</span>
                </div>
                <div className="kv-row" style={{ padding: 0, border: 0 }}>
                  <span className="kv-key">Status</span>
                  <span className="kv-val">
                    {result.isRevoked ? 'revoked' : result.isClaimed ? 'claimed' : 'unclaimed'}
                  </span>
                </div>
              </div>
            )}

            {result && !canOverride && (
              <div className="notice notice-warn">
                <Warning size={14} />
                <span>
                  {result.isRevoked
                    ? 'This identity was revoked — its token no longer exists.'
                    : 'No token has been claimed under this name yet, so there is nothing to override.'}
                </span>
              </div>
            )}

            {canOverride && (
              <>
                <div className="field">
                  <span className="label">Set this token to</span>
                  <div className="grid grid-2" style={{ gap: 10 }}>
                    <button className={`radio-card${!tokenTransferable ? ' is-active' : ''}`} onClick={() => setTokenTransferable(false)}>
                      <span className="radio-card-head">
                        <span className="radio-dot" />
                        <span className="radio-card-title">Soulbound</span>
                      </span>
                    </button>
                    <button className={`radio-card${tokenTransferable ? ' is-active' : ''}`} onClick={() => setTokenTransferable(true)}>
                      <span className="radio-card-head">
                        <span className="radio-dot" />
                        <span className="radio-card-title">Transferable</span>
                      </span>
                    </button>
                  </div>
                </div>
                <div>
                  <button className="btn" onClick={() => setTokenDrawer(true)}>
                    Review token override
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <TxDrawer
        open={projectDrawer}
        onClose={() => { setProjectDrawer(false); projectTx.reset() }}
        tx={projectTx}
        title="Change default token policy"
        summary={`New identities will mint as ${choice ? 'transferable' : 'soulbound'}.`}
        rows={[
          { k: 'Namespace', v: `${project.slug}.rwa-id.eth` },
          { k: 'Default policy', v: `${project.transferable ? 'Transferable' : 'Soulbound'} → ${choice ? 'Transferable' : 'Soulbound'}`, tone: 'accent' },
          { k: 'Existing tokens', v: 'unaffected' },
        ]}
        fn="setProjectTransferable(uint256,bool)"
        onSign={signProject}
        onDone={refresh}
      />

      <TxDrawer
        open={tokenDrawer}
        onClose={() => { setTokenDrawer(false); tokenTx.reset() }}
        tx={tokenTx}
        title="Override token policy"
        summary={`Token #${result?.tokenId} becomes ${tokenTransferable ? 'transferable' : 'soulbound'}.`}
        rows={[
          { k: 'Identity', v: `${result?.name}.${project.slug}.rwa-id.eth` },
          { k: 'Token',    v: `#${result?.tokenId}` },
          { k: 'Holder',   v: result?.holder ? shortAddress(result.holder) : '—' },
          { k: 'New policy', v: tokenTransferable ? 'Transferable' : 'Soulbound', tone: 'accent' },
        ]}
        fn="setTokenTransferable(uint256,bool)"
        onSign={signToken}
        onDone={() => { reset(); setQuery(''); refresh() }}
      />
    </div>
  )
}
