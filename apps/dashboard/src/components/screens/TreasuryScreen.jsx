import { useState } from 'react'
import { isAddress, getAddress } from 'viem'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { shortAddress, treasuryPercent, usdCompact } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'
import { ArrowRight, Warning } from '../icons'

export default function TreasuryScreen({ project, projectId, refresh, protocolFeePercent }) {
  const [value, setValue]   = useState('')
  const [drawer, setDrawer] = useState(false)
  const tx = useTx()

  const trimmed = value.trim()
  const valid   = isAddress(trimmed)
  const same    = valid && trimmed.toLowerCase() === project.treasury.toLowerCase()

  const hint = !trimmed
    ? { tone: '', text: 'Fees paid after this transaction route to the new address only.' }
    : !valid
      ? { tone: 'hint-danger', text: 'Not a valid Ethereum address.' }
      : same
        ? { tone: 'hint-danger', text: 'That is already the treasury for this project.' }
        : { tone: 'hint-good', text: 'Valid address.' }

  const sign = () => {
    tx.writeContract({
      address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'updateTreasury',
      // Checksum before sending — pasted addresses are often all-lowercase.
      args: [BigInt(projectId), getAddress(trimmed)],
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="screen-title" style={{ marginBottom: 7 }}>Treasury</h1>
        <p className="screen-sub">
          The address that receives your {treasuryPercent(protocolFeePercent)}% share of every claim fee.
        </p>
      </div>

      <div className="card maxw-680">
        <div className="card-head">Change destination</div>
        <div className="card-body card-stack">
          <div className="compare-cell">
            <div className="mono-label" style={{ marginBottom: 8 }}>Current treasury</div>
            <div className="mono" style={{ fontSize: 13.5, overflowWrap: 'anywhere' }}>{project.treasury}</div>
            <div className="mono-note" style={{ marginTop: 8 }}>
              received {usdCompact(project.treasuryRevenue)} to date
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="tr-input">New treasury address</label>
            <div className={`input-shell${trimmed && (!valid || same) ? ' is-invalid' : ''}`}>
              <input id="tr-input" value={value} onChange={(e) => setValue(e.target.value)}
                placeholder="0x…" autoComplete="off" spellCheck="false" style={{ fontSize: 13.5 }} />
            </div>
            <div className={`hint ${hint.tone}`}>{hint.text}</div>
          </div>

          <div className="notice notice-warn">
            <Warning size={15} />
            <div>
              Fees paid after this transaction go to the new address only. Send a small test transfer first
              if this is a fresh custody account — the contract cannot recover funds sent to a wrong address.
            </div>
          </div>

          <div>
            <button className="btn btn-ink" disabled={!valid || same} onClick={() => setDrawer(true)}>
              Review transaction<ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        title="Update treasury"
        summary="Future claim fees settle to the new address."
        rows={[
          { k: 'Current treasury', v: shortAddress(project.treasury) },
          { k: 'New treasury',     v: valid ? shortAddress(getAddress(trimmed)) : '—', tone: 'accent' },
          { k: 'Applies to',       v: 'claims after confirmation' },
        ]}
        fn="updateTreasury(uint256,address)"
        onSign={sign}
        onDone={() => { setValue(''); refresh() }}
      />
    </div>
  )
}
