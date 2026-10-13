import { useState } from 'react'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { num } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'

const WHILE_PAUSED = [
  { tone: 'good',   text: 'Existing identities keep resolving' },
  { tone: 'good',   text: 'Allowlist and root stay intact' },
  { tone: 'danger', text: 'New claims are rejected onchain' },
  { tone: 'danger', text: 'The claim page shows a paused notice' },
]

export default function AvailabilityScreen({ project, projectId, refresh }) {
  const [drawer, setDrawer] = useState(false)
  const tx = useTx()

  const pausing = project.active

  const sign = () => {
    tx.writeContract({
      address: RWAID_ADDRESS, abi: RWAID_ABI,
      functionName: pausing ? 'pauseProject' : 'unpauseProject',
      args: [BigInt(projectId)],
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="screen-title" style={{ marginBottom: 7 }}>Availability</h1>
        <p className="screen-sub">
          Stop or resume new claims. Identities already issued keep resolving either way.
        </p>
      </div>

      <div className="card maxw-680">
        <div className="card-body row row-wrap" style={{ gap: 16, alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="row" style={{ gap: 10, marginBottom: 6 }}>
              <span style={{ font: '600 17px/1.2 var(--f-sans)', letterSpacing: '-.015em' }}>
                Claiming is {project.active ? 'open' : 'paused'}
              </span>
              <span className={`pill ${project.active ? 'pill-good' : 'pill-warn'}`}>
                <span className="dot" />{project.active ? 'Active' : 'Paused'}
              </span>
            </div>
            <div className="body" style={{ fontSize: 12.5 }}>
              {project.allowlisted != null
                ? `${num(project.totalClaimed)} of ${num(project.allowlisted)} allowlisted clients have claimed.`
                : `${num(project.totalClaimed)} identities claimed so far.`}
            </div>
          </div>
          <button className="btn" style={{ flex: 'none' }} onClick={() => setDrawer(true)}>
            {pausing ? 'Pause claiming' : 'Resume claiming'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--hairline-faint)', padding: '18px 20px', background: 'var(--surface-2)' }}>
          <div className="mono-label" style={{ marginBottom: 12 }}>While paused</div>
          <div className="paused-grid">
            {WHILE_PAUSED.map(item => (
              <div key={item.text} className="row" style={{ gap: 9, alignItems: 'flex-start' }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%', marginTop: 7, flex: 'none',
                  background: item.tone === 'good' ? 'var(--good)' : 'var(--danger)',
                }} />
                <span style={{ font: '400 12.5px/1.5 var(--f-sans)', color: 'var(--ink-2)' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        title={pausing ? 'Pause claiming' : 'Resume claiming'}
        summary={pausing
          ? 'New claims will be rejected until you resume.'
          : 'Allowlisted clients can claim again immediately.'}
        rows={[
          { k: 'Namespace', v: `${project.slug}.rwa-id.eth` },
          { k: 'Status',    v: `${project.active ? 'Active' : 'Paused'} → ${pausing ? 'Paused' : 'Active'}`, tone: 'accent' },
          { k: 'Existing identities', v: 'unaffected' },
        ]}
        fn={pausing ? 'pauseProject(uint256)' : 'unpauseProject(uint256)'}
        onSign={sign}
        onDone={refresh}
      />
    </div>
  )
}
