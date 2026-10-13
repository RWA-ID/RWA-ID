import { useState } from 'react'
import { useReadContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { effectiveFee, num, treasuryPercent, usd } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'
import { ArrowRight, Warning } from '../icons'

export default function ClaimFeeScreen({ project, projectId, refresh, protocolFeePercent }) {
  const [value, setValue]   = useState('')
  const [drawer, setDrawer] = useState(false)
  const tx = useTx()

  const { data: minFee } = useReadContract({
    address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'minimumClaimFee',
  })
  const minimum    = minFee ?? 500000n
  const minimumNum = Number(formatUnits(minimum, 6))

  const current    = effectiveFee(project, minimum)
  const currentNum = Number(formatUnits(current, 6))

  const yourPct     = treasuryPercent(protocolFeePercent)
  const protocolPct = 100 - yourPct
  const yourCut     = yourPct / 100
  const protocolCut = protocolPct / 100

  const parsed  = parseFloat(value)
  const hasInput = value !== '' && Number.isFinite(parsed)
  // 0 is meaningful: it tells the contract to fall back to the protocol minimum.
  const nextNum = !hasInput ? currentNum : (parsed > 0 ? parsed : minimumNum)
  const belowMin = hasInput && parsed > 0 && parsed < minimumNum
  const unchanged = !hasInput || nextNum === currentNum

  const unclaimed = project.allowlisted != null
    ? Math.max(project.allowlisted - Number(project.totalClaimed), 0)
    : null

  const sign = () => {
    tx.writeContract({
      address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'updateClaimFee',
      args: [BigInt(projectId), parsed > 0 ? parseUnits(value, 6) : 0n],
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="screen-title" style={{ marginBottom: 7 }}>Claim fee</h1>
        <p className="screen-sub">
          What each client pays in USDC to claim their identity. Changes apply to claims made after the
          transaction confirms.
        </p>
      </div>

      <div className="grid grid-form start" style={{ gap: 22 }}>
        <div className="card">
          <div className="card-head">Update fee</div>
          <div className="card-body card-stack">
            <div className="compare">
              <div className="compare-cell">
                <div className="mono-label" style={{ marginBottom: 8 }}>Current</div>
                <div className="compare-value">{usd(current)}</div>
              </div>
              <ArrowRight size={16} className="compare-arrow" />
              <div className="compare-cell next">
                <div className="mono-label" style={{ marginBottom: 8 }}>New</div>
                <div className="compare-value">{usd(nextNum)}</div>
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="fee-input">New claim fee</label>
              <div className={`input-shell${belowMin ? ' is-invalid' : ''}`} style={{ maxWidth: 280 }}>
                <input id="fee-input" type="number" min="0" step="0.01" value={value}
                  onChange={(e) => setValue(e.target.value)} placeholder={currentNum.toFixed(2)} style={{ fontSize: 15 }} />
                <span className="affix">USDC</span>
              </div>
              <div className={`hint${belowMin ? ' hint-danger' : ''}`}>
                {belowMin
                  ? `Below the ${usd(minimum)} protocol minimum — the contract will reject this.`
                  : `Protocol minimum ${usd(minimum)} · enter 0 to fall back to it.`}
              </div>
            </div>

            <div className="split-2">
              <div className="split-cell">
                <div className="mono-label" style={{ marginBottom: 8 }}>Your treasury · {yourPct}%</div>
                <div className="split-value good sm">{usd(nextNum * yourCut)}</div>
              </div>
              <div className="split-cell muted">
                <div className="mono-label" style={{ marginBottom: 8 }}>Protocol · {protocolPct}%</div>
                <div className="split-value sm">{usd(nextNum * protocolCut)}</div>
              </div>
            </div>

            <div>
              <button className="btn btn-accent" disabled={unchanged || belowMin} onClick={() => setDrawer(true)}>
                Review transaction<ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="mono-label" style={{ marginBottom: 14 }}>Projected impact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div className="kv-row" style={{ padding: 0, border: 0 }}>
                <span className="kv-key">Unclaimed allowlist</span>
                <span className="kv-val">{unclaimed != null ? num(unclaimed) : '—'}</span>
              </div>
              <div className="kv-row" style={{ padding: 0, border: 0 }}>
                <span className="kv-key">Your revenue if all claim</span>
                <span className="kv-val good">
                  {unclaimed != null ? usd(unclaimed * nextNum * yourCut) : '—'}
                </span>
              </div>
              <div className="kv-row" style={{ padding: 0, border: 0 }}>
                <span className="kv-key">Settlement</span>
                <span className="kv-val">per claim, instant</span>
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--hairline-faint)', margin: '16px 0' }} />
            <p className="body" style={{ fontSize: 12 }}>
              Fees settle in USDC directly to your treasury at claim time. RWA-ID never holds your revenue.
            </p>
          </div>
        </div>
      </div>

      {Number(project.totalClaimed) > 0 && (
        <div className="notice notice-warn mt-20">
          <Warning size={15} />
          <span>
            {num(project.totalClaimed)} client{Number(project.totalClaimed) === 1 ? ' has' : 's have'} already
            claimed at the old price. Existing identities are not re-charged.
          </span>
        </div>
      )}

      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        title="Update claim fee"
        summary={`New claims will cost ${usd(nextNum)} in USDC.`}
        rows={[
          { k: 'Current fee',   v: usd(current) },
          { k: 'New fee',       v: usd(nextNum), tone: 'accent' },
          { k: 'Your share',    v: usd(nextNum * yourCut), tone: 'good' },
          { k: 'Protocol share', v: usd(nextNum * protocolCut) },
        ]}
        fn="updateClaimFee(uint256,uint256)"
        onSign={sign}
        onDone={() => { setValue(''); refresh() }}
      />
    </div>
  )
}
