import { useEffect, useState } from 'react'

const STEPS = [
  { title: 'Register your namespace', body: 'Pick a permanent slug. Every client name you issue lives under it as name.slug.rwa-id.eth. Registering is one free transaction on Robinhood Chain; you only pay gas, a fraction of a cent.', art: ['yourplatform', '.rwa-id.eth', 'one tx'] },
  { title: 'Publish your allowlist', body: 'Upload a CSV of client names and wallets. The proof tree is built in your browser and pinned to IPFS. Only its root goes on-chain, so client lists never touch a server you do not control.', art: ['clients.csv', 'proof root', 'on-chain'] },
  { title: 'Sponsor the fee, or charge it', body: 'Clients can pay the claim fee in USDG, or you fund a sponsor pool and they claim free. Your 70% share still lands in your treasury either way.', art: ['sponsor pool', 'claim', '70% to you'] },
  { title: 'Share the link, or deliver', body: 'Send clients the claim link, or deliver names straight to their wallets from the Sponsorship screen. Add your own artwork and every name shows it on OpenSea.', art: ['claim link', 'client wallet', 'name + NFT'] },
  { title: 'Administer with an audit trail', body: 'Adjust fees, override transferability per token, revoke compromised identities. Every action is a signed transaction anyone can verify on Robinhood Chain.', art: ['your signature', 'contract call', 'public record'] },
]

export default function SetupGuide({ onClose }) {
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Setup guide">
      <div className="overlay" onClick={onClose} />
      <div className="modal">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="kicker">Setup guide · {i + 1} of {STEPS.length}</span>
          <button className="icon-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <h2 className="display" style={{ fontSize: 40 }}>{step.title}</h2>
        <p className="body">{step.body}</p>
        <div className="row" style={{ padding: 20, borderRadius: 16, background: 'var(--paper)', justifyContent: 'center' }}>
          {step.art.map((label, n) => (
            <span key={label} className="row" style={{ gap: 10 }}>
              {n > 0 && <span style={{ color: 'var(--faint)' }}>→</span>}
              <span className="pill" style={{ background: n === step.art.length - 1 ? 'var(--lime)' : '#fff', boxShadow: 'var(--ring-ink)' }}>{label}</span>
            </span>
          ))}
        </div>
        <div className="row">
          {STEPS.map((s, n) => <span key={s.title} style={{ width: 8, height: 8, borderRadius: 2.5, background: n === i ? 'var(--ink)' : 'var(--line-strong)' }} />)}
          <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}>{last ? 'Close' : 'Skip'}</button>
          <button className="btn btn-sm btn-ink" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? 'Done' : 'Next →'}</button>
        </div>
      </div>
    </div>
  )
}
