import { useState } from 'react'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import TxDrawer, { useTx } from '../TxDrawer'

export default function AvailabilityScreen({ project, projectId, refresh }) {
  const [drawer, setDrawer] = useState(false)
  const tx = useTx()
  const active = project.active
  const fn = active ? 'pauseProject' : 'unpauseProject'

  return (
    <div className="card card-pad" style={{ maxWidth: 720, padding: 28, gap: 18, borderRadius: 24 }}>
      <div className="row" style={{ flexWrap: 'nowrap', gap: 14 }}>
        <span className="status-tile" style={{ background: active ? 'var(--lime)' : 'var(--orange)' }}>{active ? '▶' : 'II'}</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{active ? 'Claiming is open' : 'Claiming is paused'}</span>
          <span className="note">{active ? 'Allowlisted clients can claim right now.' : 'Existing identities still resolve. New claims and deliveries are blocked.'}</span>
        </span>
      </div>
      <button className="btn btn-ink" style={{ alignSelf: 'flex-start', height: 48, padding: '0 24px' }} onClick={() => setDrawer(true)}>
        {active ? 'Pause claiming' : 'Reopen claiming'}
      </button>
      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        title={active ? 'Pause claiming' : 'Reopen claiming'}
        summary={active ? `New claims under ${project.slug} are blocked until you reopen.` : `Allowlisted clients can claim under ${project.slug} again.`}
        rows={[{ k: 'Status', v: active ? 'Active → Paused' : 'Paused → Active' }]}
        fn={`${fn}(uint256)`}
        onSign={() => tx.writeContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: fn, args: [BigInt(projectId)] })}
        onDone={refresh}
      />
    </div>
  )
}
