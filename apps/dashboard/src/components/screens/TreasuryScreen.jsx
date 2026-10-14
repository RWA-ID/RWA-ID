import { useState } from 'react'
import { isAddress } from 'viem'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { explorerAddress } from '../../lib/chain'
import { shortAddress, treasuryPercent } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'

export default function TreasuryScreen({ project, projectId, refresh, protocolFeePercent }) {
  const [next, setNext] = useState('')
  const [drawer, setDrawer] = useState(false)
  const tx = useTx()
  const valid = isAddress(next.trim()) && next.trim().toLowerCase() !== project.treasury.toLowerCase()

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <div className="card ink card-pad" style={{ gap: 10 }}>
        <span className="label" style={{ color: 'var(--steel)' }}>Current treasury</span>
        <a className="mono" href={explorerAddress(project.treasury)} target="_blank" rel="noreferrer"
          style={{ fontSize: 'clamp(14px,1.8vw,18px)', fontWeight: 700, color: 'var(--lime)', wordBreak: 'break-all' }}>{project.treasury}</a>
        <span className="note" style={{ color: 'var(--steel)' }}>Receives {treasuryPercent(protocolFeePercent)}% of every claim fee, the moment it is paid.</span>
      </div>
      <div className="card card-pad">
        <span className="card-title">Change treasury</span>
        <input className={`input${next && !isAddress(next.trim()) ? ' bad' : ''}`} value={next} onChange={(e) => setNext(e.target.value)} placeholder="0x… new treasury address" spellCheck="false" />
        <span className="note">Use a Safe or another wallet you control on Robinhood Chain. Fees sent to a wrong address cannot be recovered.</span>
        <button className="btn btn-ink" style={{ alignSelf: 'flex-start' }} disabled={!valid} onClick={() => setDrawer(true)}>Update treasury</button>
      </div>
      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        title="Change treasury"
        summary="Future claim fees go to the new address."
        rows={[{ k: 'Treasury', v: `${shortAddress(project.treasury)} → ${shortAddress(next.trim())}` }]}
        fn="updateTreasury(uint256,address)"
        onSign={() => tx.writeContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'updateTreasury', args: [BigInt(projectId), next.trim()] })}
        onDone={() => { setNext(''); refresh() }}
      />
    </div>
  )
}
