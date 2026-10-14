import { useState } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { num, treasuryPercent, usd } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'

const MIN = 0.5

export default function ClaimFeeScreen({ project, projectId, refresh, protocolFeePercent }) {
  const yourPct = treasuryPercent(protocolFeePercent)
  const [fee, setFee] = useState(formatUnits(project.effectiveFee, 6))
  const [drawer, setDrawer] = useState(false)
  const tx = useTx()

  const n = Number(fee)
  const ok = fee.trim() !== '' && Number.isFinite(n) && n >= 0 && /^\d*(\.\d{0,6})?$/.test(fee.trim())
  const eff = Math.max(ok ? n : 0, MIN)
  const current = Number(formatUnits(project.effectiveFee, 6))
  const changed = ok && parseUnits(fee.trim(), 6) !== project.effectiveFee

  return (
    <div className="grid grid-2">
      <div className="card card-pad" style={{ gap: 18 }}>
        <span className="card-title">Set a new fee</span>
        <div style={{ display: 'flex', alignItems: 'center', height: 64, padding: '0 18px', borderRadius: 16, boxShadow: ok ? 'var(--ring-lime)' : 'var(--ring-orange)' }}>
          <input value={fee} onChange={(e) => setFee(e.target.value)} inputMode="decimal" aria-label="Claim fee in USDG"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }} />
          <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--faint)' }}>USDG</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {[0.5, 1, 2.5, 5].map(v => <button key={v} className="btn btn-sm" onClick={() => setFee(v.toFixed(2))}>{usd(v)}</button>)}
        </div>
        <span className="note">
          {ok && n < MIN ? 'Below the 0.50 USDG protocol minimum, so the contract will charge 0.50.' : `Currently ${usd(current)}. Paid once per name, in USDG, when it is claimed. Existing names are unaffected.`}
        </span>
        <button className="btn btn-ink btn-lg" disabled={!changed} onClick={() => setDrawer(true)}>Update claim fee</button>
      </div>

      <div className="card ink card-pad" style={{ gap: 16 }}>
        <span className="label" style={{ color: 'var(--steel)' }}>Split per claim</span>
        <div className="split-bar">
          <span style={{ flex: yourPct, background: 'var(--lime)' }}>{usd(eff * yourPct / 100)}</span>
          <span style={{ flex: 100 - yourPct, background: 'var(--orange)', fontSize: 16 }}>{usd(eff * (100 - yourPct) / 100)}</span>
        </div>
        <div className="row mono" style={{ justifyContent: 'space-between', fontSize: 11.5, color: 'var(--steel)' }}>
          <span>{yourPct}% · your treasury</span><span>{100 - yourPct}% · protocol</span>
        </div>
        <span className="note" style={{ color: 'var(--steel)', fontSize: 14 }}>
          {project.allowlisted
            ? <>At {num(project.allowlisted)} allowlisted clients, a full claim-through pays your treasury <b style={{ color: 'var(--lime)' }}>{usd(eff * yourPct / 100 * project.allowlisted)}</b>.</>
            : 'Publish an allowlist to see what a full claim-through would pay your treasury.'}
        </span>
        <span className="note" style={{ color: 'var(--steel)' }}>
          Sponsoring instead? Claims paid from your sponsor pool still route your {yourPct}% back to your treasury, so each sponsored name costs you only the protocol’s {100 - yourPct}%.
        </span>
      </div>

      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        title="Update claim fee"
        summary={`New claims under ${project.slug} will cost ${usd(eff)} USDG.`}
        rows={[{ k: 'Fee', v: `${usd(current)} → ${usd(eff)}` }, { k: 'Your share per claim', v: usd(eff * yourPct / 100) }]}
        fn="updateClaimFee(uint256,uint256)"
        onSign={() => tx.writeContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'updateClaimFee', args: [BigInt(projectId), parseUnits(fee.trim(), 6)] })}
        onDone={refresh}
      />
    </div>
  )
}
