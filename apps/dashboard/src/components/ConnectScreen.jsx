import { useEffect } from 'react'
import { modal } from '../lib/wagmi'
import { linkTo, siteHome } from '../lib/nav'
import { RwaMark, Wordmark } from './Brand'

const STEPS = [
  { n: '01', bg: 'var(--lime)', title: 'Create a namespace', body: 'Register yourplatform.rwa-id.eth once. Free, and owned by your wallet.' },
  { n: '02', bg: 'var(--orange)', title: 'Issue identities', body: 'Allowlist client wallets by CSV. They claim their name and identity NFT, or you deliver it to them.' },
  { n: '03', bg: '#fff', title: 'Manage everything', body: 'Set claim fees, sponsor claims, add your NFT artwork, pause claiming or revoke a name.' },
]

// Decorative: four columns of name cards drifting past, the same mix of claimed,
// allowlisted and revoked names the console manages.
const NAMES = ['joe', 'treasury', 'maria', 'desk', 'ana', 'kai', 'vault', 'lee', 'sam', 'ivy', 'omar', 'ops']
const SPACES = ['acme', 'harbor', 'northgate', 'meridian']
const hex = (i) => '0x' + ((i * 2654435761) >>> 0).toString(16).padStart(8, '0').slice(0, 4) + '…' + ((i * 40503 + 7) >>> 0).toString(16).slice(-4)

function NameCard({ k, c }) {
  const kind = k % 5 === 2 ? 'issue' : k % 7 === 3 ? 'revoke' : 'claim'
  const [label, dot] = kind === 'issue' ? ['Allowlisted', 'var(--orange)'] : kind === 'revoke' ? ['Revoked', 'var(--muted)'] : ['Claimed', 'var(--lime)']
  return (
    <div className="gate-card">
      <div className="row mono" style={{ justifyContent: 'space-between', fontSize: 11, flexWrap: 'nowrap' }}>
        <span style={{ color: 'var(--muted)' }}>{hex(k + 11)}</span>
        <span className="row" style={{ gap: 6, color: 'var(--steel)', flexWrap: 'nowrap' }}>
          <i style={{ background: dot, animationDuration: `${2 + (k % 3)}s`, animationDelay: `${(k % 4) * 0.4}s` }} />{label}
        </span>
      </div>
      <b className={kind === 'revoke' ? 'revoked' : ''}>{NAMES[k % NAMES.length]}.{SPACES[(k + c) % SPACES.length]}<span>.rwa-id.eth</span></b>
    </div>
  )
}

function MotionBg() {
  return (
    <div className="gate-motion" aria-hidden="true">
      {[0, 1, 2, 3].map(c => {
        const cards = Array.from({ length: 9 }, (_, i) => c * 9 + i)
        return (
          <div key={c} className="gate-col" style={{ marginTop: c % 2 ? -120 : 0, animationDuration: `${46 + c * 9}s`, animationDirection: c % 2 ? 'reverse' : 'normal' }}>
            {cards.map(k => <NameCard key={k} k={k} c={c} />)}
            {cards.map(k => <NameCard key={`d${k}`} k={k} c={c} />)}
          </div>
        )
      })}
    </div>
  )
}

/** Shown on the console before a wallet is connected. */
export default function ConnectScreen() {
  useEffect(() => { document.title = 'Console · RWA ID' }, [])
  const home = siteHome()

  return (
    <div className="gate">
      <MotionBg />
      <span className="gate-glow lime" aria-hidden="true" />
      <span className="gate-glow orange" aria-hidden="true" />
      <header className="gate-head">
        <a href={home} onClick={linkTo} className="lockup" style={{ color: '#fff' }} aria-label="RWA ID — home">
          <RwaMark size={30} tone="dark" /><Wordmark size={19} />
        </a>
        <span className="gate-pill">Console</span>
        <span className="gate-chain"><i />Robinhood Chain</span>
      </header>
      <main className="gate-main">
        <div className="gate-copy">
          <span className="kicker on-ink" style={{ letterSpacing: '.16em' }}>RWA ID Console · for platforms</span>
          <h1>Create, issue<br />&amp; manage <span>identities</span></h1>
          <p>
            The control room for your namespace. Connect the wallet that owns it, or the one you want to register it
            with. Everything is read from and written to Robinhood Chain, so there’s no account to create.
          </p>
          <div className="gate-steps">
            {STEPS.map(s => (
              <div key={s.n}>
                <span className="n" style={{ background: s.bg }}>{s.n}</span>
                <span><b>{s.title}</b><small>{s.body}</small></span>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 20 }}>
            <button type="button" className="gate-connect" onClick={() => modal.open()}>Connect wallet →</button>
            <a href={home} onClick={linkTo} className="gate-back">← Back to rwa-id.com</a>
          </div>
        </div>
      </main>
    </div>
  )
}
