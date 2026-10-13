import { useEffect, useState } from 'react'
import { ArrowRight, Close } from './icons'

const STEPS = [
  {
    title: 'Register your namespace',
    body: 'Pick a permanent slug — every client identity you issue lives under it as name.slug.rwa-id.eth. This is one free transaction; you only pay gas.',
    art: ['yourfirm', '.rwa-id.eth', 'one tx'],
  },
  {
    title: 'Publish your allowlist',
    body: 'Upload a CSV of client names and wallets. The Merkle tree is built in your browser and pinned to IPFS — only the root goes onchain, so no client list ever touches a server you do not control.',
    art: ['clients.csv', 'merkle root', 'onchain'],
  },
  {
    title: 'Share the claim link',
    body: 'Your clients open the claim page, connect their wallet, and mint their identity. Fees settle in USDC to your treasury at claim time.',
    art: ['claim link', 'client wallet', 'USDC to you'],
  },
  {
    title: 'Administer with an audit trail',
    body: 'Adjust fees, override transferability per token, revoke compromised identities. Every action is a signed onchain transaction anyone can verify.',
    art: ['your signature', 'contract call', 'public record'],
  },
]

export default function SetupGuide({ onClose }) {
  const [i, setI] = useState(0)
  const step   = STEPS[i]
  const isLast = i === STEPS.length - 1

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Setup guide">
      <div className="overlay" onClick={onClose} />
      <div className="modal">
        <div style={{ padding: '22px 24px 0' }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <span className="mono-label">Setup guide · step {i + 1} of {STEPS.length}</span>
            <button className="close-btn" onClick={onClose} aria-label="Close"><Close size={12} /></button>
          </div>
          <h2 style={{ font: '600 22px/1.2 var(--f-sans)', letterSpacing: '-.02em', marginBottom: 10 }}>
            {step.title}
          </h2>
          <p style={{ font: '400 13.5px/1.6 var(--f-sans)', color: 'var(--mute-2)', marginBottom: 20, textWrap: 'pretty' }}>
            {step.body}
          </p>
        </div>

        <div className="walk-art">
          {step.art.map((label, n) => (
            <span key={label} className="walk-art-item">
              {n > 0 && <ArrowRight size={14} className="query-arrow" />}
              <span className="chip">{label}</span>
            </span>
          ))}
        </div>

        <div className="row" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {STEPS.map((s, n) => (
              <span key={s.title} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: n === i ? 'var(--ink)' : 'var(--border-strong)',
              }} />
            ))}
          </div>
          <button className="link-btn" style={{ marginLeft: 'auto', color: 'var(--mute-3)' }} onClick={onClose}>
            {isLast ? 'Close' : 'Skip'}
          </button>
          <button className="btn btn-ink btn-sm" onClick={() => (isLast ? onClose() : setI(i + 1))}>
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
