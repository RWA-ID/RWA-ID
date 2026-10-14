import { useState } from 'react'
import { isAddress } from 'viem'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { shortAddress } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'

export default function OwnershipScreen({ project, projectId, go, refresh }) {
  const [next, setNext] = useState('')
  const [drawer, setDrawer] = useState(false)
  const tx = useTx()
  const to = next.trim()
  const valid = isAddress(to) && to.toLowerCase() !== project.owner.toLowerCase()

  return (
    <div className="card card-pad" style={{ maxWidth: 720 }}>
      <span className="card-title">Transfer project ownership</span>
      <span className="note">
        The new wallet gains full admin control immediately: allowlist, fee, treasury, sponsor pool, artwork and
        revocation. You lose access to this project. Use a Safe on Robinhood Chain for anything long-lived.
      </span>
      <input className={`input${to && !isAddress(to) ? ' bad' : ''}`} value={next} onChange={(e) => setNext(e.target.value)} placeholder="0x… new owner" spellCheck="false" />
      <button className="btn btn-orange" style={{ alignSelf: 'flex-start' }} disabled={!valid} onClick={() => setDrawer(true)}>Transfer ownership</button>
      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        title="Transfer project ownership"
        summary={`${shortAddress(to)} becomes the owner of ${project.slug}.rwa-id.eth.`}
        rows={[{ k: 'Owner', v: `${shortAddress(project.owner)} → ${shortAddress(to)}`, tone: 'danger' }]}
        fn="transferProjectOwnership(uint256,address)"
        danger
        confirmWord="TRANSFER"
        warning="This wallet loses every admin right over the project the moment this confirms. Check the address character by character."
        ctaLabel="Transfer ownership"
        onSign={() => tx.writeContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'transferProjectOwnership', args: [BigInt(projectId), to] })}
        onDone={() => { refresh(); go('projects', null) }}
      />
    </div>
  )
}
