import { useEffect, useState } from 'react'
import { isAddress, keccak256, parseUnits, toBytes, zeroAddress } from 'viem'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { readClient } from '../../lib/readClient'
import { shortAddress, slugProblem, treasuryPercent, usd } from '../../lib/format'
import { CONTACT } from '../../lib/nav'
import TxDrawer, { useTx } from '../TxDrawer'

const STEPS = ['Namespace', 'Fee & treasury', 'Policy', 'Review']
const MIN_FEE = 0.5

/**
 * Availability straight from v4 state: projectIdBySlugHash says taken, and
 * reservedTo + reservationExpiry say whether someone else holds the slug.
 * Returns 'checking' | 'available' | 'taken' | 'reserved' | 'yours' | 'error'.
 */
function useSlugStatus(slug, address, valid) {
  const [status, setStatus] = useState('idle')
  useEffect(() => {
    if (!valid) { setStatus('idle'); return }
    setStatus('checking')
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const h = keccak256(toBytes(slug))
        const c = (functionName) => ({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName, args: [h] })
        const [pid, holder, expiry] = await readClient.multicall({
          contracts: [c('projectIdBySlugHash'), c('reservedTo'), c('reservationExpiry')], allowFailure: false,
        })
        if (cancelled) return
        const live = holder !== zeroAddress && expiry > BigInt(Math.floor(Date.now() / 1000))
        setStatus(pid > 0n ? 'taken' : live && holder.toLowerCase() !== address?.toLowerCase() ? 'reserved' : live ? 'yours' : 'available')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [slug, address, valid])
  return status
}

export default function CreateProject({ address, go, onCreated, protocolFeePercent }) {
  const yourPct = treasuryPercent(protocolFeePercent)
  const [step, setStep] = useState(1)
  const [slug, setSlug] = useState('')
  const [fee, setFee] = useState('1.00')
  const [treasury, setTreasury] = useState(address || '')
  const [transferable, setTransferable] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const tx = useTx()

  const problem = slug ? slugProblem(slug) : null
  const status = useSlugStatus(slug, address, !!slug && !problem)
  const feeNum = Number(fee)
  const feeOk = fee.trim() !== '' && Number.isFinite(feeNum) && feeNum >= 0 && /^\d*(\.\d{0,6})?$/.test(fee.trim())
  const eff = Math.max(feeOk ? feeNum : 0, MIN_FEE)
  const treasuryOk = isAddress(treasury)

  const chip = !slug ? ['Type a slug', 'var(--paper)', 'var(--faint)', 'var(--paper)']
    : problem ? ['Invalid', 'var(--ink)', 'var(--orange-soft)', 'var(--orange)']
    : status === 'checking' ? ['Checking', 'var(--paper)', 'var(--faint)', 'var(--paper)']
    : status === 'reserved' ? ['Reserved', 'var(--orange)', 'var(--ink)', 'var(--orange)']
    : status === 'taken' ? ['Taken', 'var(--ink)', '#fff', 'var(--steel)']
    : status === 'error' ? ['Retry', 'var(--paper)', 'var(--orange-deep)', 'var(--orange)']
    : ['Available', 'var(--lime)', 'var(--ink)', 'var(--lime)']

  const note = !slug ? 'Try your platform’s name: 3–32 characters, a–z, 0–9 and hyphens. 36 RWA platform slugs are reserved for their owners.'
    : problem ? `${problem} The contract rejects anything else.`
    : status === 'checking' ? 'Checking Robinhood Chain…'
    : status === 'reserved' ? `${slug} is held for its platform. If it’s yours, email ${CONTACT} and the multisig will assign it to your wallet.`
    : status === 'taken' ? `${slug}.rwa-id.eth already belongs to another project.`
    : status === 'error' ? 'Could not read the registry. Edit the slug to retry.'
    : status === 'yours' ? `${slug} is reserved for this wallet. Registering it is free.`
    : `${slug}.rwa-id.eth is open. Registering it is free, and the slug can never be changed.`

  const canNext = step === 1 ? (status === 'available' || status === 'yours')
    : step === 2 ? feeOk && treasuryOk
    : true

  const sign = () => tx.writeContract({
    address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'createProject',
    args: [slug, treasury, parseUnits(fee.trim() || '0', 6), transferable],
  })

  return (
    <div className="wizard">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="kicker">New project</span>
        <h1 className="display" style={{ fontSize: 'clamp(40px,5vw,60px)' }}>Register a namespace</h1>
      </div>
      <div className="wizard-steps">
        {STEPS.map((label, i) => (
          <div key={label} className={i + 1 < step ? 'done' : i + 1 === step ? 'cur' : ''}>
            <i /><span>0{i + 1} · {label}</span>
          </div>
        ))}
      </div>

      <div className="card card-pad" style={{ padding: 'clamp(22px,3vw,32px)', gap: 22, borderRadius: 24 }}>
        {step === 1 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Choose your slug</span>
              <span className="note">This becomes the parent of every name you issue.</span>
            </div>
            <div className="slug-pill" style={{ boxShadow: `0 0 0 1.5px var(--ink), 0 0 0 5px ${chip[3]}` }}>
              <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().trim())} placeholder="yourplatform"
                aria-label="Namespace slug" autoComplete="off" spellCheck="false" autoFocus />
              <span className="sfx">.rwa-id.eth</span>
              <span className="status" style={{ background: chip[1], color: chip[2] }}>{chip[0]}</span>
            </div>
            <span className="note">{note}</span>
          </>
        )}

        {step === 2 && (
          <>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Fee and treasury</span>
            <label className="field">
              <span className="label">Claim fee (USDG)</span>
              <input className={`input${feeOk ? '' : ' bad'}`} value={fee} onChange={(e) => setFee(e.target.value)} inputMode="decimal" />
            </label>
            <div className="split2">
              <span style={{ background: 'var(--lime)' }}><small>You receive · {yourPct}%</small><b>{usd(eff * yourPct / 100)}</b></span>
              <span style={{ background: 'var(--orange)' }}><small>Protocol · {100 - yourPct}%</small><b>{usd(eff * (100 - yourPct) / 100)}</b></span>
            </div>
            <span className="note">
              {feeOk && feeNum < MIN_FEE
                ? 'Below the 0.50 USDG protocol minimum, so the contract will charge 0.50.'
                : 'Paid once per name, in USDG, when it is claimed. You can sponsor it so clients pay nothing.'}
            </span>
            <label className="field">
              <span className="label">Treasury address</span>
              <div className="input-affix">
                <input value={treasury} onChange={(e) => setTreasury(e.target.value.trim())} placeholder="0x…" spellCheck="false" />
                <button type="button" className="btn btn-sm" onClick={() => setTreasury(address || '')}>Use connected</button>
              </div>
              {treasury && !treasuryOk && <span className="hint bad">Not a valid address.</span>}
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Default policy</span>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
              <button type="button" className={`choice${!transferable ? ' on' : ''}`} onClick={() => setTransferable(false)}>
                <b>Soulbound</b><span>Names stay with the wallet they were issued to. Best for KYC’d clients and compliance records.</span>
              </button>
              <button type="button" className={`choice${transferable ? ' on' : ''}`} onClick={() => setTransferable(true)}>
                <b>Transferable</b><span>Names move with the holder. Best for fund and desk wallets that change hands.</span>
              </button>
            </div>
            <span className="note">You can override this per token later.</span>
          </>
        )}

        {step === 4 && (
          <>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Review</span>
            <div className="kv well">
              <div className="kv-row"><span>Namespace</span><span>{slug}.rwa-id.eth</span></div>
              <div className="kv-row"><span>Claim fee</span><span>{usd(eff)} USDG</span></div>
              <div className="kv-row"><span>Treasury</span><span>{shortAddress(treasury)}</span></div>
              <div className="kv-row"><span>Default policy</span><span>{transferable ? 'Transferable' : 'Soulbound'}</span></div>
              <div className="kv-row"><span>Network</span><span>Robinhood Chain</span></div>
            </div>
            <span className="note">One transaction on Robinhood Chain. Creating a namespace is free; you only pay the network fee, a fraction of a cent.</span>
          </>
        )}

        <div className="row" style={{ justifyContent: 'space-between', paddingTop: 6 }}>
          <button className="btn" onClick={() => (step === 1 ? go('projects', null) : setStep(step - 1))}>← Back</button>
          <button className="btn btn-lime" disabled={!canNext} onClick={() => (step === 4 ? setDrawer(true) : setStep(step + 1))}>
            {step === 4 ? 'Create namespace →' : 'Continue →'}
          </button>
        </div>
      </div>

      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        title="Register namespace"
        summary={`Creates ${slug}.rwa-id.eth with you as owner.`}
        rows={[
          { k: 'Namespace', v: `${slug}.rwa-id.eth` },
          { k: 'Owner', v: shortAddress(address) },
          { k: 'Treasury', v: shortAddress(treasury) },
          { k: 'Claim fee', v: `${usd(eff)} USDG` },
          { k: 'Token policy', v: transferable ? 'Transferable' : 'Soulbound' },
        ]}
        fn="createProject(string,address,uint256,bool)"
        onSign={sign}
        onDone={() => { onCreated(); go('projects', null) }}
      />
    </div>
  )
}
