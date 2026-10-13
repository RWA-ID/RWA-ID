import { useEffect, useState } from 'react'
import '../landing.css'
import SetupGuide from './SetupGuide'
import ContactModal from './ContactModal'
import { RWAID_ADDRESS } from '../lib/contracts'
import { shortAddress } from '../lib/format'
import { ArrowRight, Bridge, Check, Shield } from './icons'

// Docs live on this console (see DocsPage) rather than in an external wiki, so
// the reference tracks the deployed contract instead of drifting behind it.
export const DOCS_PATH      = '/docs'
export const GITHUB_URL     = 'https://github.com/RWA-ID/RWA-ID'
export const WHITEPAPER_URL = 'https://github.com/RWA-ID/RWA-ID/blob/main/whitepaper.md'
export const REGISTRY_URL   = `https://etherscan.io/address/${RWAID_ADDRESS}`
export const RESOLVER_URL   = 'https://etherscan.io/address/0x765FB675AC33a85ccb455d4cb0b5Fb1f2D345eb1'
export const GATEWAY_URL    = 'https://gateway.rwa-id.com'
export const CONTACT_EMAIL  = 'partner@rwa-id.com'
export const X_HANDLE       = '@rwa_ideth'
export const X_URL          = 'https://x.com/rwa_ideth'

// Must match <title> in index.html — the SPA restores it after routing away.
const HOME_TITLE = 'RWA-ID — Identity issuance and management for RWA platforms'

const WALLETS = [
  { file: 'metamask', name: 'MetaMask' },
  { file: 'trust',    name: 'Trust' },
  { file: 'rainbow',  name: 'Rainbow' },
  { file: 'coinbase', name: 'Coinbase' },
  { file: 'safe',     name: 'Safe' },
  { file: 'uniswap',  name: 'Uniswap' },
  { file: 'phantom',  name: 'Phantom' },
]

const CHAINS = [
  { file: 'ethereum',     name: 'Ethereum' },
  { file: 'base',         name: 'Base' },
  { file: 'arbitrum-one', name: 'Arbitrum' },
  { file: 'optimism',     name: 'Optimism' },
  { file: 'polygon',      name: 'Polygon' },
  { file: 'avalanche',    name: 'Avalanche' },
  { file: 'solana',       name: 'Solana' },
  { file: 'bitcoin',      name: 'Bitcoin' },
]

// The phone mock claims "6 CHAINS" — keep this list exactly six long.
const PHONE_CHAINS = ['ethereum', 'base', 'arbitrum-one', 'optimism', 'polygon', 'solana']
  .map(file => CHAINS.find(c => c.file === file))

// Docs are a real URL (crawlable, shareable) routed client-side on click.
export function goToDocs(e) {
  e.preventDefault()
  window.history.pushState({}, '', DOCS_PATH)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
}

/* ── The client's face in the identity row — illustrated, not a stock photo ── */
function PhoneAvatar() {
  return (
    <span className="phone-avatar" aria-hidden="true">
      <svg viewBox="0 0 40 40" className="phone-avatar-art">
        <defs>
          <clipPath id="pa-clip"><circle cx="20" cy="20" r="20" /></clipPath>
          <linearGradient id="pa-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4C8DFF" />
            <stop offset="1" stopColor="#7C5CFF" />
          </linearGradient>
        </defs>
        <g clipPath="url(#pa-clip)">
          <rect width="40" height="40" fill="url(#pa-bg)" />
          {/* shoulders */}
          <path d="M20 23.4c7.1 0 12.9 5.2 12.9 11.6V40H7.1v-5c0-6.4 5.8-11.6 12.9-11.6z" fill="#F4F4F2" opacity=".95" />
          {/* head */}
          <circle cx="20" cy="15.2" r="6.9" fill="#F4F4F2" />
        </g>
      </svg>
    </span>
  )
}

function LogoTile({ src, alt, label }) {
  return (
    <span className="logo-tile">
      <span className="logo-tile-mark"><img src={src} alt="" width="36" height="36" /></span>
      <span className="logo-tile-label">{label ?? alt}</span>
    </span>
  )
}

/* ── The phone mock; percentages are measured against hand-phone.png ─────── */
function PhoneMock() {
  return (
    <div className="hero-photo">
      <img
        src="/brand/hand-phone.png"
        alt="A client holding a phone showing their verified RWA-ID identity"
        className="hero-photo-img"
      />
      <div className="phone-screen">
        <div className="phone-glare" />

        <div className="phone-row phone-head">
          <span className="phone-title">Wallet</span>
          <span className="phone-resolved">
            <span className="phone-dot" />RESOLVED
          </span>
        </div>

        <div className="phone-identity">
          <PhoneAvatar />
          <span className="phone-identity-text">
            <span className="phone-name">joe.rwa-id.eth</span>
            <span className="phone-addr">0x7F3a…E6f7</span>
          </span>
          <span className="phone-check"><Check /></span>
        </div>

        <div className="phone-segment">
          <span>Tokens</span>
          <span className="is-active">Names</span>
        </div>

        <div className="phone-row phone-label-row">
          <span className="phone-label">RESOLVES ON</span>
          <span className="phone-label dim">6 CHAINS</span>
        </div>

        <div className="phone-list">
          {PHONE_CHAINS.map((c, i) => (
            <span key={c.file} className="phone-list-row" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>
              <span className="phone-chain-mark"><img src={`/brand/chains/${c.file}.svg`} alt="" /></span>
              <span className="phone-chain-name">{c.name}</span>
              <span className="phone-check sm"><Check /></span>
            </span>
          ))}
        </div>

        <div className="phone-spacer" />
        <div className="phone-foot"><span className="phone-foot-dot" />SOULBOUND · #2841</div>
        <div className="phone-home"><span /></div>
      </div>
    </div>
  )
}

export default function Landing({ onConnect }) {
  const [showGuide, setShowGuide]     = useState(false)
  const [showContact, setShowContact] = useState(false)

  // Routing to docs or a legal page retitles the tab; restore it on the way back.
  useEffect(() => {
    document.title = HOME_TITLE
  }, [])

  return (
    <div className="landing">
      {/* ── Nav ── */}
      <nav className="l-nav">
        <div className="l-brand">
          <span className="l-brand-mark">R</span>
          <span className="l-brand-word">RWA·ID</span>
        </div>
        <div className="l-nav-links">
          <a className="l-nav-pill" href={WHITEPAPER_URL} target="_blank" rel="noreferrer">Whitepaper</a>
          <a className="l-nav-pill" href={DOCS_PATH} onClick={goToDocs}>Docs</a>
          <a className="l-nav-pill" href={REGISTRY_URL} target="_blank" rel="noreferrer">Contract</a>
          <button className="l-connect" onClick={onConnect}>
            <span className="l-connect-dot" />Connect wallet
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="l-hero">
        <div className="hero-card">
          <div className="hero-badge">
            <span className="hero-badge-dot" />LIVE ON ETHEREUM MAINNET
          </div>
          <div className="hero-spacer" />
          <h1 className="display hero-title">
            Identity issuance<br /><span className="dim">and management</span><br />for RWA platforms.
          </h1>
          <p className="lede hero-lede">
            Issue verifiable, ENS-compatible onchain identities to your clients, then administer them —
            fees, transferability, revocation — without touching KYC or internal ID systems.
            Non-custodial, resolvable on any chain, auditable by anyone.
          </p>
          <div className="row row-wrap">
            <button className="btn btn-accent btn-lg" onClick={onConnect}>
              Connect wallet<ArrowRight size={15} width={1.6} />
            </button>
            <a className="btn btn-lg hero-ghost" href={DOCS_PATH} onClick={goToDocs}>Read the docs</a>
          </div>
          <p className="hero-note">Read-only until you sign. No accounts, no backend, no custody.</p>
        </div>
        <PhoneMock />
      </section>

      {/* ── Logo strips ── */}
      <section className="l-strip">
        <div className="l-strip-inner">
          <div>
            <div className="mono-label strip-label">Wallets that resolve</div>
            <div className="logo-row">
              {WALLETS.map(w => (
                <LogoTile key={w.file} src={`/brand/wallets/${w.file}.svg`} alt={w.name} />
              ))}
            </div>
          </div>
          <div>
            <div className="mono-label strip-label">Chains resolved</div>
            <div className="logo-row">
              {CHAINS.map(c => (
                <LogoTile key={c.file} src={`/brand/chains/${c.file}.svg`} alt={c.name} />
              ))}
            </div>
          </div>
        </div>
        <div className="l-meta">
          <span>REGISTRY&ensp;<a href={REGISTRY_URL} target="_blank" rel="noreferrer" className="l-meta-link">{shortAddress(RWAID_ADDRESS, 6, 4)}</a></span>
          <span className="l-meta-rule" />
          <span>NON-CUSTODIAL</span>
          <span className="l-meta-rule" />
          <span>NO BACKEND, NO INDEXER</span>
        </div>
      </section>

      {/* ── How resolution works ── */}
      <section className="l-section">
        <div className="l-section-head">
          <div>
            <div className="mono-label" style={{ marginBottom: 18 }}>How a name resolves</div>
            <h2 className="display-2">One name.<br /><span className="dim">Every chain.</span></h2>
          </div>
          <p className="l-section-lede">
            Every identity you issue is a real ENS name, so wallets already know how to read it — no SDK,
            no custom integration. Records are fetched offchain, verified onchain, and carried to other
            chains by Chainlink CCIP.
          </p>
        </div>

        <div className="l-cards">
          <article className="l-card">
            <div className="l-card-head">
              <img src="/brand/ens.jpeg" alt="ENS" className="l-card-logo" />
              <span className="mono-label">01&ensp;ENSIP‑10</span>
            </div>
            <h3 className="l-card-title">Wildcard resolution</h3>
            <p className="body">
              Your namespace points at a single resolver contract. Every subname under it —{' '}
              <span className="code-inline">joe.rwa-id.eth</span> — answers without ever being registered.
              Issuing a client costs no name registration.
            </p>
          </article>

          <article className="l-card">
            <div className="l-card-head">
              <span className="l-card-icon"><Bridge size={19} /></span>
              <span className="mono-label">02&ensp;EIP‑3668</span>
            </div>
            <h3 className="l-card-title">CCIP‑Read lookup</h3>
            <p className="body">
              The resolver reverts with <span className="code-inline">OffchainLookup</span>. The wallet fetches
              the record from the gateway and the contract verifies the signed response onchain before
              returning it — cheap data, onchain trust.
            </p>
          </article>

          <article className="l-card">
            <img src="/brand/chainlink-ccip.png" alt="Chainlink CCIP" className="l-card-banner" />
            <span className="mono-label">03&ensp;CROSS‑CHAIN</span>
            <h3 className="l-card-title">CCIP wildcard resolver</h3>
            <p className="body">
              The same record is readable from Base, Arbitrum, Optimism and Polygon. Chainlink CCIP carries
              the request to Ethereum and returns the verified answer, so one name resolves everywhere.
            </p>
          </article>
        </div>

        <div className="query-path">
          <span className="mono-label" style={{ marginRight: 4 }}>Query path</span>
          <span className="chip">joe.rwa-id.eth</span>
          <ArrowRight size={15} className="query-arrow" />
          <span className="chip dim">ENS registry</span>
          <ArrowRight size={15} className="query-arrow" />
          <span className="chip dim">wildcard resolver</span>
          <ArrowRight size={15} className="query-arrow" />
          <span className="chip dim">CCIP gateway</span>
          <ArrowRight size={15} className="query-arrow" />
          <span className="chip chip-good"><span className="dot-sm" />0x7F3a…E6f7</span>
        </div>
      </section>

      {/* ── What it does for you ── */}
      <section className="l-section">
        <div className="l-section-head">
          <div>
            <div className="mono-label" style={{ marginBottom: 18 }}>Why institutions issue</div>
            <h2 className="display-2">Verify a client<br /><span className="dim">in one call.</span></h2>
          </div>
          <p className="l-section-lede">
            An RWA-ID is three things at once: a compliance primitive your systems can query, a revenue
            line that settles in USDC, and a human-readable address your clients actually use to move
            tokenized assets.
          </p>
        </div>

        <div className="l-cards l-cards-util">
          {/* 1 — verification */}
          <article className="l-card">
            <div className="l-card-head">
              <span className="l-card-icon"><Shield size={19} /></span>
              <span className="mono-label">For your platform</span>
            </div>
            <h3 className="l-card-title">Onchain verification, no integration</h3>
            <p className="body">
              Check whether a wallet belongs to a client you onboarded with one read. No API keys, no
              webhook, no vendor uptime in your critical path — it is a public contract call any service
              can make.
            </p>
            <pre className="l-code">
              <span className="dim">{'// does this name belong to one of ours?'}</span>{'\n'}
              <span className="l-code-kw">const</span> holder = <span className="l-code-kw">await</span> client.<span className="l-code-fn">getEnsAddress</span>({'{'}{'\n'}
              {'  '}name: <span className="l-code-str">'joe.yourfirm.rwa-id.eth'</span>,{'\n'}
              {'}'}) <span className="dim">{'// → 0x7F3a…E6f7'}</span>
            </pre>
            <ul className="l-list">
              <li><Check size={13} /> Soulbound by default — bound to the wallet that passed KYC</li>
              <li><Check size={13} /> Revocable by you, instantly, onchain</li>
              <li><Check size={13} /> Every issuance and revocation is publicly auditable</li>
            </ul>
          </article>

          {/* 2 — monetization (dark, so the money card reads as its own thing) */}
          <article className="l-card l-card-dark">
            <div className="l-card-head">
              <span className="mono-label light">Monetization</span>
            </div>
            <h3 className="l-card-title light">You set the fee. You keep 70%.</h3>
            <p className="body light">
              Registering your namespace is free — you only pay gas. Each client pays a claim fee you
              choose, in USDC, at the moment they claim. It settles straight to your treasury; RWA-ID
              never holds your revenue.
            </p>
            <div className="l-split">
              <div className="l-split-cell">
                <div className="mono-label light">Your treasury · 70%</div>
                <div className="l-split-value good">$5,250</div>
              </div>
              <div className="l-split-cell muted">
                <div className="mono-label light">Protocol · 30%</div>
                <div className="l-split-value">$2,250</div>
              </div>
            </div>
            <p className="l-split-note">
              Worked example: 5,000 clients × a $1.50 claim fee. Set it to $0.50 or $50 — the contract only
              enforces the $0.50 protocol minimum, and you can change it whenever you like.
            </p>
          </article>

          {/* 3 — client benefit */}
          <article className="l-card">
            <div className="l-card-head">
              <span className="l-card-icon"><Bridge size={19} /></span>
              <span className="mono-label">For your clients</span>
            </div>
            <h3 className="l-card-title">A name, not a 42-character address</h3>
            <p className="body">
              Your clients send and receive tokenized stocks, funds and other real-world assets using
              <span className="code-inline"> joe.yourfirm.rwa-id.eth</span> — in the wallet they already
              have. The same name resolves on Ethereum, Base, Arbitrum, Optimism and Polygon, so a
              transfer cannot land on the wrong chain's address.
            </p>
            <div className="l-transfer">
              <div className="l-transfer-row">
                <span className="mono-label">Send 250 tokenized AAPL to</span>
              </div>
              <div className="l-transfer-name">joe.yourfirm.rwa-id.eth</div>
              <div className="l-transfer-foot">
                <span className="pill pill-good"><span className="dot" />Verified client</span>
                <span className="mono-note">resolves to 0x7F3a…E6f7</span>
              </div>
            </div>
            <ul className="l-list">
              <li><Check size={13} /> Mis-typed addresses stop being a settlement risk</li>
              <li><Check size={13} /> Counterparties can verify the holder before they send</li>
              <li><Check size={13} /> Works in MetaMask, Safe, Rainbow, Coinbase Wallet and more</li>
            </ul>
          </article>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="l-cta">
        <div className="mono-label" style={{ marginBottom: 16 }}>Ready when your compliance team is</div>
        <h2 className="display-2">Issue your first<br /><span className="dim">institutional identity.</span></h2>
        <div className="row row-wrap" style={{ justifyContent: 'center', marginTop: 30 }}>
          <button className="btn btn-accent btn-lg" onClick={onConnect}>
            Connect wallet<ArrowRight size={15} width={1.6} />
          </button>
          <button className="btn btn-lg hero-ghost" onClick={() => setShowGuide(true)}>
            How it works
          </button>
          <button className="btn btn-lg hero-ghost" onClick={() => setShowContact(true)}>
            Book a walkthrough
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="l-footer">
        <div className="l-footer-top">
          <div className="l-footer-brand">
            <div className="l-brand">
              <span className="l-brand-mark">R</span>
              <span className="l-brand-word">RWA·ID</span>
            </div>
            <p className="l-footer-tag">
              Identity infrastructure for regulated onchain finance. Non-custodial, ENS-native, live on
              Ethereum mainnet.
            </p>
            <a className="l-social" href={X_URL} target="_blank" rel="noreferrer" aria-label="RWA-ID on X">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              {X_HANDLE}
            </a>
          </div>

          <div className="l-footer-cols">
            <div className="l-footer-col">
              <div className="l-footer-col-head">Protocol</div>
              <a href={REGISTRY_URL} target="_blank" rel="noreferrer">Registry contract</a>
              <a href={RESOLVER_URL} target="_blank" rel="noreferrer">Resolver contract</a>
              <a href={GATEWAY_URL} target="_blank" rel="noreferrer">CCIP gateway</a>
              <a href={`${REGISTRY_URL}#code`} target="_blank" rel="noreferrer">Verified source</a>
            </div>
            <div className="l-footer-col">
              <div className="l-footer-col-head">Developers</div>
              <a href={DOCS_PATH} onClick={goToDocs}>Technical docs</a>
              <a href={WHITEPAPER_URL} target="_blank" rel="noreferrer">Whitepaper</a>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
              <a href="https://docs.ens.domains/ensip/10" target="_blank" rel="noreferrer">ENSIP-10 wildcard</a>
            </div>
            <div className="l-footer-col">
              <div className="l-footer-col-head">Legal</div>
              <a href="/privacy">Privacy policy</a>
              <a href="/terms">Terms &amp; conditions</a>
              <a href="/refunds">Refund policy</a>
            </div>
            <div className="l-footer-col">
              <div className="l-footer-col-head">Company</div>
              <button onClick={() => setShowGuide(true)}>How it works</button>
              <button onClick={() => setShowContact(true)}>Book a walkthrough</button>
              <a href={X_URL} target="_blank" rel="noreferrer">{X_HANDLE} on X</a>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">Security disclosures</a>
            </div>
          </div>
        </div>

        <div className="l-footer-bottom">
          <span>© {new Date().getFullYear()} RWA-ID Labs</span>
          <div className="l-footer-bottom-right">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/refunds">Refunds</a>
            <a href={REGISTRY_URL} target="_blank" rel="noreferrer">{shortAddress(RWAID_ADDRESS, 6, 5)}</a>
            <span>rwa-id.eth</span>
          </div>
        </div>
      </footer>

      {showGuide   && <SetupGuide   onClose={() => setShowGuide(false)} />}
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </div>
  )
}
