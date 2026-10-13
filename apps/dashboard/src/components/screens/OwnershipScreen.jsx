import { useState } from 'react'
import { isAddress, getAddress } from 'viem'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { shortAddress } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'

export default function OwnershipScreen({ project, projectId, refresh, go, address }) {
  const [value, setValue]   = useState('')
  const [drawer, setDrawer] = useState(false)
  const tx = useTx()

  const trimmed = value.trim()
  const valid   = isAddress(trimmed)
  const same    = valid && trimmed.toLowerCase() === project.owner.toLowerCase()

  const sign = () => {
    tx.writeContract({
      address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'transferProjectOwnership',
      args: [BigInt(projectId), getAddress(trimmed)],
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="screen-title" style={{ marginBottom: 7 }}>Ownership</h1>
        <p className="screen-sub">Who holds admin rights over {project.slug}.rwa-id.eth.</p>
      </div>

      <div className="maxw-680 stack">
        <div className="card">
          <div className="card-body">
            <div className="mono-label" style={{ marginBottom: 12 }}>Current owner</div>
            <div className="row" style={{ gap: 11 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', flex: 'none', background: 'var(--avatar)' }} />
              <span className="mono" style={{ fontSize: 14, overflowWrap: 'anywhere' }}>{project.owner}</span>
              {address?.toLowerCase() === project.owner.toLowerCase() && (
                <span className="mono-note" style={{ marginLeft: 'auto' }}>connected wallet</span>
              )}
            </div>
          </div>
        </div>

        <div className="card danger-card">
          <div className="card-head danger-head">Transfer ownership</div>
          <div className="card-body card-stack">
            <div style={{ font: '400 12.5px/1.6 var(--f-sans)', color: 'var(--danger-ink)', maxWidth: 600, textWrap: 'pretty' }}>
              The new owner immediately gains full control of the allowlist, fees, treasury, revocations and
              this transfer power. Your access ends when the transaction confirms. There is no recovery path.
            </div>

            <div className="field">
              <label className="label" htmlFor="own-input" style={{ color: 'var(--danger-ink)' }}>
                New owner address
              </label>
              <div className={`input-shell is-danger${trimmed && (!valid || same) ? ' is-invalid' : ''}`}>
                <input id="own-input" value={value} onChange={(e) => setValue(e.target.value)}
                  placeholder="0x…" autoComplete="off" spellCheck="false" style={{ fontSize: 13.5 }} />
              </div>
              {trimmed && !valid && <div className="hint hint-danger">Not a valid Ethereum address.</div>}
              {same && <div className="hint hint-danger">That wallet already owns this project.</div>}
            </div>

            <div>
              <button className="btn btn-danger" disabled={!valid || same} onClick={() => setDrawer(true)}>
                Review transfer
              </button>
            </div>
          </div>
        </div>
      </div>

      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        title="Transfer ownership"
        summary={`Hands ${project.slug}.rwa-id.eth to another wallet.`}
        rows={[
          { k: 'Namespace', v: `${project.slug}.rwa-id.eth` },
          { k: 'Current owner', v: shortAddress(project.owner) },
          { k: 'New owner', v: valid ? shortAddress(getAddress(trimmed)) : '—', tone: 'danger' },
          { k: 'Your access', v: 'revoked on confirmation', tone: 'danger' },
        ]}
        fn="transferProjectOwnership(uint256,address)"
        danger
        confirmWord="TRANSFER"
        warning="You will lose every admin right over this namespace the moment this confirms. It cannot be undone from this console."
        ctaLabel="Transfer ownership"
        onSign={sign}
        onDone={() => { setValue(''); refresh(); go('projects', null) }}
      />
    </div>
  )
}
