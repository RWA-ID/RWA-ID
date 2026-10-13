import { useEffect, useState } from 'react'
import { useReadContract } from 'wagmi'
import { isAddress, parseUnits } from 'viem'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { readClient } from '../../lib/readClient'
import { treasuryPercent, usd, shortAddress } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'
import { ArrowLeft, ArrowRight, Warning } from '../icons'

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,30})[a-z0-9]$/

const STEPS = [
  { n: 1, label: 'Namespace', note: 'permanent' },
  { n: 2, label: 'Economics', note: 'editable later' },
  { n: 3, label: 'Token policy', note: 'default per token' },
]

export default function CreateProject({ address, go, onCreated, protocolFeePercent }) {
  const yourPct     = treasuryPercent(protocolFeePercent)
  const protocolPct = 100 - yourPct
  const [step, setStep]         = useState(1)
  const [slug, setSlug]         = useState('')
  const [fee, setFee]           = useState('')
  const [treasury, setTreasury] = useState(address || '')
  const [transferable, setTransferable] = useState(false)
  const [drawer, setDrawer]     = useState(false)
  const [taken, setTaken]       = useState(null)   // null = unknown, true/false = checked

  const tx = useTx()
  const { data: minFee } = useReadContract({
    address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'minimumClaimFee',
  })
  const minFeeUsd = minFee ? usd(minFee) : '$0.50'

  const slugOk       = SLUG_RE.test(slug)
  const treasuryOk   = isAddress(treasury)
  const feeNum       = parseFloat(fee)
  const feeOk        = !fee || (Number.isFinite(feeNum) && feeNum >= 0)
  const effectiveNum = fee && feeNum > 0 ? feeNum : Number(minFeeUsd.replace(/[$,]/g, ''))

  // A slug is permanent, so check availability before the operator can continue.
  useEffect(() => {
    if (!slugOk) { setTaken(null); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const nextId = await readClient.readContract({
          address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'nextProjectId',
        })
        const total = Number(nextId) - 1
        if (total <= 0) { if (!cancelled) setTaken(false); return }
        const results = await readClient.multicall({
          contracts: Array.from({ length: total }, (_, i) => ({
            address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'projects', args: [BigInt(i + 1)],
          })),
          allowFailure: true,
        })
        const used = results.some(r => {
          if (!r.result) return false
          const arr = Array.isArray(r.result) ? r.result : Object.values(r.result)
          return String(arr[1]).toLowerCase() === slug
        })
        if (!cancelled) setTaken(used)
      } catch {
        if (!cancelled) setTaken(null)
      }
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [slug, slugOk])

  const slugMessage = () => {
    if (!slug) return { text: '3–32 characters · a–z, 0–9 and hyphens · not at the start or end', tone: '' }
    if (!slugOk) return { text: 'Not valid — use 3–32 characters, a–z, 0–9 and hyphens (not at the start or end).', tone: 'hint-danger' }
    if (taken === true)  return { text: `${slug}.rwa-id.eth is already registered — pick another slug.`, tone: 'hint-danger' }
    if (taken === false) return { text: `${slug}.rwa-id.eth is available.`, tone: 'hint-good' }
    return { text: 'Checking availability onchain…', tone: '' }
  }
  const msg = slugMessage()
  const canContinue = slugOk && taken === false

  const sign = () => {
    tx.writeContract({
      address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'createProject',
      args: [slug, treasury, fee && feeNum > 0 ? parseUnits(fee, 6) : 0n, transferable],
    })
  }

  return (
    <div>
      <button className="back-link" style={{ marginBottom: 20 }} onClick={() => go('projects', null)}>
        <ArrowLeft size={12} />All projects
      </button>

      <div style={{ marginBottom: 26 }}>
        <h1 className="screen-title" style={{ marginBottom: 7 }}>Register a namespace</h1>
        <p className="screen-sub">Three steps, one transaction. The namespace itself is free — you only pay gas.</p>
      </div>

      <div className="grid grid-wizard start" style={{ gap: 26 }}>
        <div className="card">
          <div className="wizard-rail">
            {STEPS.map(s => (
              <div key={s.n} className={`wizard-step${step === s.n ? ' is-current' : ''}${step > s.n ? ' is-done' : ''}`}>
                <div className="row" style={{ gap: 8, marginBottom: 5 }}>
                  <span className="wizard-dot">{s.n}</span>
                  <span style={{ font: '500 12.5px/1 var(--f-sans)' }}>{s.label}</span>
                </div>
                <div className="mono-note" style={{ paddingLeft: 27 }}>{s.note}</div>
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="card-body card-stack">
              <div className="field">
                <label className="label" htmlFor="cp-slug">Namespace slug</label>
                <div className={`input-shell${slug && !slugOk ? ' is-invalid' : ''}`}>
                  <input
                    id="cp-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
                    placeholder="yourfirm"
                    autoComplete="off"
                    spellCheck="false"
                    style={{ fontSize: 15 }}
                  />
                  <span className="affix">.rwa-id.eth</span>
                </div>
                <div className={`hint ${msg.tone}`}>{msg.text}</div>
              </div>

              <div className="notice notice-warn">
                <Warning size={15} />
                <div>
                  The slug is written to the contract and <strong>can never be changed</strong>. Every
                  identity you issue will live under it permanently.
                </div>
              </div>

              <div className="row">
                <button className="btn btn-ink" disabled={!canContinue} onClick={() => setStep(2)}>
                  Continue to economics<ArrowRight size={13} />
                </button>
                <span className="mono-note">nothing is signed yet</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card-body card-stack">
              <div className="field">
                <label className="label" htmlFor="cp-fee">
                  Claim fee <span className="label-note">— blank uses the protocol minimum ({minFeeUsd})</span>
                </label>
                <div className={`input-shell${!feeOk ? ' is-invalid' : ''}`} style={{ maxWidth: 280 }}>
                  <input id="cp-fee" type="number" min="0" step="0.01" value={fee}
                    onChange={(e) => setFee(e.target.value)} placeholder="1.50" style={{ fontSize: 15 }} />
                  <span className="affix">USDC</span>
                </div>
                <div className="hint">
                  The contract enforces a {minFeeUsd} minimum. You can change the fee at any time.
                </div>
              </div>

              <div className="split-2">
                <div className="split-cell">
                  <div className="mono-label" style={{ marginBottom: 8 }}>Your treasury · {yourPct}%</div>
                  <div className="split-value good">{usd(effectiveNum * (yourPct / 100))}</div>
                </div>
                <div className="split-cell muted">
                  <div className="mono-label" style={{ marginBottom: 8 }}>Protocol · {protocolPct}%</div>
                  <div className="split-value">{usd(effectiveNum * (protocolPct / 100))}</div>
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="cp-treasury">
                  Treasury address <span className="label-note">— receives your share of every claim</span>
                </label>
                <div className={`input-shell${treasury && !treasuryOk ? ' is-invalid' : ''}`}>
                  <input id="cp-treasury" value={treasury} onChange={(e) => setTreasury(e.target.value.trim())}
                    placeholder="0x…" autoComplete="off" spellCheck="false" style={{ fontSize: 13.5 }} />
                  <button type="button" className="affix" onClick={() => setTreasury(address || '')}>
                    Use connected
                  </button>
                </div>
                {treasury && !treasuryOk && <div className="hint hint-danger">Not a valid Ethereum address.</div>}
              </div>

              <div className="row">
                <button className="btn" onClick={() => setStep(1)}>Back</button>
                <button className="btn btn-ink" disabled={!treasuryOk || !feeOk} onClick={() => setStep(3)}>
                  Continue to token policy<ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card-body card-stack">
              <div className="field">
                <span className="label">Default token policy</span>
                <div className="grid grid-2" style={{ gap: 10 }}>
                  <button className={`radio-card${!transferable ? ' is-active' : ''}`} onClick={() => setTransferable(false)}>
                    <span className="radio-card-head">
                      <span className="radio-dot" />
                      <span className="radio-card-title">Soulbound</span>
                      <span className="badge-advised">ADVISED</span>
                    </span>
                    <span className="radio-card-desc">
                      Non-transferable. The identity stays bound to the wallet that passed your KYC.
                    </span>
                  </button>
                  <button className={`radio-card${transferable ? ' is-active' : ''}`} onClick={() => setTransferable(true)}>
                    <span className="radio-card-head">
                      <span className="radio-dot" />
                      <span className="radio-card-title">Transferable</span>
                    </span>
                    <span className="radio-card-desc">
                      Standard ERC-721. Holders can move or sell the identity token.
                    </span>
                  </button>
                </div>
              </div>

              <div className="row">
                <button className="btn" onClick={() => setStep(2)}>Back</button>
                <button className="btn btn-accent" onClick={() => setDrawer(true)}>
                  Review transaction<ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live preview */}
        <div className="preview">
          <div className="preview-head">Live preview</div>
          <div style={{ padding: '20px 18px' }}>
            <div className="preview-name">
              m.ellington<span className="dim">.{slug || 'yourfirm'}.rwa-id.eth</span>
            </div>
            <div className="preview-rule" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="preview-row"><span>CLAIM FEE</span><span>{fee && feeNum > 0 ? usd(feeNum) : `${minFeeUsd} (min)`}</span></div>
              <div className="preview-row"><span>TREASURY</span><span>{treasuryOk ? shortAddress(treasury) : '—'}</span></div>
              <div className="preview-row"><span>POLICY</span><span>{transferable ? 'Transferable' : 'Soulbound'}</span></div>
              <div className="preview-row"><span>NETWORK</span><span>Ethereum mainnet</span></div>
            </div>
          </div>
          <div className="preview-foot">
            Your clients see this name resolve on any EVM chain the moment they claim.
          </div>
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
          { k: 'Owner',     v: shortAddress(address) },
          { k: 'Treasury',  v: shortAddress(treasury) },
          { k: 'Claim fee', v: fee && feeNum > 0 ? usd(feeNum) : `${minFeeUsd} (protocol minimum)` },
          { k: 'Token policy', v: transferable ? 'Transferable' : 'Soulbound' },
        ]}
        fn="createProject(string,address,uint256,bool)"
        ctaLabel="Sign in wallet"
        onSign={sign}
        onDone={() => { onCreated(); go('projects', null) }}
      />
    </div>
  )
}
