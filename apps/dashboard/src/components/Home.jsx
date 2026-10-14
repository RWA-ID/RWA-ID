import { useEffect } from 'react'
import { RwaMark } from './Brand'
import { SiteFooter, SiteHeader } from './SiteChrome'
import { GITHUB, CONTACT, linkTo } from '../lib/nav'
import { explorerAddress } from '../lib/chain'
import { RWAID_ADDRESS } from '../lib/contracts'
import RESERVED from '../lib/reserved.json'

const WALLETS = [
  ['MetaMask', 'metamask'], ['Coinbase Wallet', 'coinbase'], ['Rainbow', 'rainbow'], ['Uniswap', 'uniswap'],
  ['Trust Wallet', 'trust'], ['Zerion', 'zerion'], ['Ledger', 'ledger'], ['Safe', 'safe'], ['Brave', 'brave'], ['OpenSea', 'opensea'],
]
const RESERVED_COUNT = RESERVED.groups.reduce((n, g) => n + g.names.length, 0)
// Read from reservationExpiry() on the live registry (deploy-v4 reserved for 3 years).
const RESERVED_UNTIL = '12 October 2029'

function Hero() {
  return (
    <div className="inset" style={{ paddingTop: 16 }}>
      <section className="hero" data-screen-label="Hero">
        <span className="glow lime" aria-hidden="true" />
        <span className="glow orange" aria-hidden="true" />
        <div className="hero-copy">
          <span className="kicker on-ink">Wallet identity for tokenized-asset platforms</span>
          <h1>One name<br /><span>Every client</span></h1>
          <p>
            Give every client wallet on your platform a readable name like joe.yourplatform.rwa-id.eth.
            It resolves in the wallets they already use.
          </p>
          <div className="row" style={{ gap: 12 }}>
            <a href="/console" onClick={linkTo} className="btn btn-lime btn-lg">Register a namespace →</a>
            <a href="/claim" onClick={linkTo} className="btn btn-ghost-ink btn-lg">Claim your identity</a>
          </div>
          <div className="hero-trust">
            <b>We never touch your compliance stack.</b>
            <div className="trust-pills">
              <span><i>✕</i>No KYC</span>
              <span><i>✕</i>No PII</span>
              <span><i>✕</i>No access to internal ID systems</span>
            </div>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-strip">
            <s>0x4f3a9c…a21c</s>
            <b>→</b>
            <strong>joe.acme<span>.rwa-id.eth</span></strong>
          </div>
          <div className="hero-nft">
            <div className="top">
              <RwaMark size={64} tone="light" />
              <span>#4398</span>
            </div>
            <div className="bottom">
              <small>Identity NFT · acme</small>
              <strong>joe.acme<br />.rwa-id.eth</strong>
              <span className="chips"><span className="solid">Soulbound</span><span>Verified holder</span></span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function Standard() {
  return (
    <div className="inset" style={{ marginTop: 96 }}>
      <section className="panel-white" data-screen-label="Standard">
        <div className="section-head center" style={{ marginBottom: 0 }}>
          <h2 className="h2-lg">The identity layer for real-world assets.</h2>
          <p className="lede" style={{ maxWidth: 660 }}>
            Every RWA platform was building its own identity system, and none of them talked to each other.
            RWA ID is one neutral, shared namespace for client wallets, built on ENS.
          </p>
        </div>

        <div className="facts">
          <div className="fact">
            <div className="diagram" aria-hidden="true">
              <span className="abs" style={{ left: '50%', top: 18, transform: 'translateX(-50%)', padding: '11px 18px', borderRadius: 14, background: 'var(--ink)', color: '#fff', fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap' }}>rwa-id<span style={{ color: 'var(--lime)' }}>.eth</span></span>
              <span className="abs" style={{ left: '50%', top: 62, width: 2, height: 28, marginLeft: -1, background: 'var(--ink)' }} />
              <span className="abs mono" style={{ left: '50%', top: 90, transform: 'translateX(-50%)', padding: '9px 16px', borderRadius: 12, background: 'var(--orange)', fontSize: 13, fontWeight: 700, boxShadow: 'var(--ring-ink)' }}>acme</span>
              <span className="abs" style={{ left: '50%', top: 126, width: 2, height: 22, marginLeft: -1, background: 'var(--ink)' }} />
              <span className="abs" style={{ left: 44, right: 44, top: 148, height: 2, background: 'var(--ink)' }} />
              <span className="abs" style={{ left: 44, top: 148, width: 2, height: 26, background: 'var(--ink)' }} />
              <span className="abs" style={{ left: 159, top: 148, width: 2, height: 26, background: 'var(--ink)' }} />
              <span className="abs" style={{ right: 44, top: 148, width: 2, height: 26, background: 'var(--ink)' }} />
              <div className="abs" style={{ left: 0, right: 0, top: 174, display: 'flex', justifyContent: 'space-between' }}>
                <span className="chip-mono" style={{ width: 90, padding: '9px 0', background: 'var(--lime)' }}>joe</span>
                <span className="chip-mono" style={{ width: 90, padding: '9px 0' }}>ana</span>
                <span className="chip-mono" style={{ width: 90, padding: '9px 0' }}>treasury</span>
              </div>
            </div>
            <span className="stat-line">Your own namespace</span>
            <p className="body">Register yourplatform.rwa-id.eth for free, then issue a name to every client wallet beneath it.</p>
          </div>

          <div className="fact">
            <div className="diagram" aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <span className="mono" style={{ padding: '12px 18px', borderRadius: 12, border: '2px dashed rgba(11,12,10,.3)', fontSize: 13, color: 'var(--faint)', textDecoration: 'line-through' }}>0x4f3a9c…e81b7a21c</span>
              <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--lime)', boxShadow: '0 0 0 2px var(--ink)' }} />
              <span style={{ padding: '13px 20px', borderRadius: 14, background: 'var(--ink)', color: '#fff', fontSize: 19, fontWeight: 700, whiteSpace: 'nowrap' }}>joe.acme<span style={{ color: 'var(--lime)' }}>.rwa-id.eth</span></span>
              <span style={{ display: 'flex', gap: 6 }}>
                {['MetaMask', 'Trust', 'Rainbow'].map(w => <span key={w} className="chip-mono" style={{ padding: '6px 10px', borderRadius: 8, fontSize: 11 }}>{w}</span>)}
              </span>
            </div>
            <span className="stat-line">One name, every wallet</span>
            <p className="body">A readable name in place of a 42-character address, in any app that reads ENS.</p>
          </div>

          <div className="fact">
            <div className="diagram" aria-hidden="true">
              <span className="abs mono" style={{ left: 0, top: 40, width: 130, height: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 16, borderRadius: 24, border: '2px solid var(--ink)', fontSize: 11, color: 'var(--muted)' }}>Platform</span>
              <span className="abs mono" style={{ right: 0, top: 40, width: 130, height: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 16, borderRadius: 24, border: '2px solid var(--ink)', background: '#fff', fontSize: 11, color: 'var(--muted)' }}>Client</span>
              <span className="abs" style={{ left: 130, right: 130, top: 92, borderTop: '2px dashed var(--ink)' }} />
              <span className="abs" style={{ left: 130, right: 130, top: 136, borderTop: '2px dashed rgba(11,12,10,.35)' }} />
              <span className="abs" style={{ left: '50%', top: 80, width: 24, height: 24, marginLeft: -12, borderRadius: 6, background: 'var(--lime)', boxShadow: '0 0 0 2px var(--ink)' }} />
              <span className="abs mono" style={{ left: 26, top: 70, padding: '8px 10px', borderRadius: 10, background: 'var(--ink)', color: '#fff', fontSize: 11, fontWeight: 700 }}>proof</span>
              <span className="abs mono" style={{ right: 24, top: 70, padding: '8px 10px', borderRadius: 10, background: 'var(--orange)', fontSize: 11, fontWeight: 700, boxShadow: 'var(--ring-ink)' }}>name</span>
            </div>
            <span className="stat-line">Zero custody</span>
            <p className="body">Names mint straight to the client’s wallet. No personal data collected, no KYC, nothing held by us.</p>
          </div>
        </div>

        <div className="nft-panel">
          <span className="g1" aria-hidden="true" /><span className="g2" aria-hidden="true" />
          <div className="section-head" style={{ position: 'relative', marginBottom: 40 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
              <span className="kicker on-ink">Every name is an NFT</span>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: 'clamp(28px,3.4vw,42px)', lineHeight: 1.05, letterSpacing: '-0.03em', textWrap: 'balance' }}>
                Allowlist once. Verify anywhere, with one on-chain check.
              </h3>
            </div>
            <p className="body" style={{ maxWidth: 380, color: 'var(--steel)' }}>
              The identity a client claims is a token in their wallet. Any contract or app can check it before
              letting them subscribe, trade or sign in.
            </p>
          </div>
          <div className="nft-cards" aria-hidden="true">
            <div className="nft-card">
              <span className="cap">01 · Platform allowlists<i style={{ background: 'var(--orange)' }} /></span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="dark-row"><span>joe</span><span>0x4f3a…a21c</span></span>
                <span className="dark-row"><span>ana</span><span>0x91c0…07e2</span></span>
                <span className="dark-row"><span>treasury</span><span>0x2b8d…f310</span></span>
              </div>
              <span className="mono" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 9, background: 'var(--orange)', color: 'var(--ink)', fontSize: 11.5, fontWeight: 700 }}>root → chain<span>0x9c2e…41e1</span></span>
            </div>
            <div className="nft-card">
              <span className="cap">02 · Client claims<i style={{ background: '#fff' }} /></span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
                <span className="mono" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--ink)', fontSize: 12 }}><span className="avatar" style={{ width: 22, height: 22 }} />0x4f3a…a21c</span>
                <span className="mono" style={{ alignSelf: 'center', fontSize: 11, color: 'var(--steel)' }}>proof ✓ · sponsored</span>
                <span className="mono" style={{ alignSelf: 'center', height: 36, display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: 999, background: 'var(--lime)', color: 'var(--ink)', fontSize: 11.5, fontWeight: 700 }}>claim() → mint</span>
              </div>
            </div>
            <div className="nft-card" style={{ background: 'var(--lime)', color: 'var(--ink)', boxShadow: 'none', justifyContent: 'space-between', minHeight: 230 }}>
              <span className="cap" style={{ color: 'var(--lime-ink)' }}>03 · Identity NFT<b className="mono" style={{ color: 'var(--ink)' }}>#4398</b></span>
              <RwaMark size={46} tone="light" />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, wordBreak: 'break-word' }}>joe.acme.rwa-id.eth</span>
                <span className="chips" style={{ fontSize: 10.5 }}><span className="solid">Soulbound</span><span>ns: acme</span><span>platform art</span></span>
              </span>
            </div>
            <div className="nft-card" style={{ background: '#fff', color: 'var(--ink)', boxShadow: 'none', gap: 12 }}>
              <span className="cap">04 · Any app verifies<i style={{ background: 'var(--lime)', boxShadow: 'var(--ring-ink)' }} /></span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="check-row">Holds an acme identity<b>✓</b></span>
                <span className="check-row">Not revoked<b>✓</b></span>
                <span className="check-row">Name resolves to wallet<b>✓</b></span>
              </div>
              <span className="mono" style={{ marginTop: 'auto', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'var(--ink)', color: 'var(--lime)', fontSize: 12, fontWeight: 700 }}>Access granted →</span>
            </div>
          </div>
          <div className="gate">
            <span className="kicker faint" style={{ padding: 0, boxShadow: 'none', marginRight: 4, fontSize: 11 }}>Gate with it</span>
            {['Investor portals', 'Fund subscriptions', 'Token transfer allowlists', 'Token-gated sign-in', 'Airdrops & distributions'].map(g => <span key={g}>{g}</span>)}
          </div>
        </div>
      </section>
    </div>
  )
}

function Wallets() {
  return (
    <section id="wallets" className="section" style={{ paddingTop: 64 }} data-screen-label="Wallets">
      <div className="section-head">
        <h2 className="h2" style={{ maxWidth: 640 }}>Works in the wallets your clients already use.</h2>
        <p className="body" style={{ maxWidth: 380 }}>
          Resolution runs through ENS and CCIP-Read, so there is nothing for a wallet to integrate. If it reads .eth, it reads RWA ID.
        </p>
      </div>
      <div className="app-wall">
        {WALLETS.map(([name, f]) => (
          <div key={f}><img src={`/apps/${f}.svg`} alt="" /><b>{name}</b></div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how" className="section" data-screen-label="How it works">
      <div className="section-head center">
        <span className="kicker">How it works</span>
        <h2 className="h2" style={{ fontSize: 'clamp(36px,4.8vw,56px)' }}>Three steps. Your clients do the last one.</h2>
      </div>
      <div className="steps">
        <div className="step">
          <div className="well" aria-hidden="true">
            <div className="mini" style={{ width: '100%', height: 56, display: 'flex', alignItems: 'center', padding: '0 6px 0 18px' }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden' }}>acme<span style={{ color: 'var(--placeholder)' }}>.rwa-id.eth</span></span>
              <span className="mono" style={{ height: 42, display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: 10, background: 'var(--lime)', fontSize: 11, fontWeight: 700 }}>Free</span>
            </div>
          </div>
          <div className="copy">
            <span className="meta" style={{ fontSize: 12 }}>01</span>
            <h3>Register your namespace</h3>
            <p className="body">Connect your platform wallet and claim yourplatform.rwa-id.eth. Set a claim fee, a treasury, and whether names can be transferred.</p>
          </div>
        </div>
        <div className="step">
          <div className="well" aria-hidden="true">
            <div className="mini mono" style={{ width: 270, display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 16px', fontSize: 12, color: 'var(--muted)' }}>
              <span style={{ color: 'var(--faint)' }}>name,wallet</span>
              <span>joe,<span style={{ color: 'var(--ink)' }}>0x4f3a…a21c</span></span>
              <span>ana,<span style={{ color: 'var(--ink)' }}>0x91c0…07e2</span></span>
              <span style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 9, background: 'var(--ink)', color: '#fff' }}>root<span style={{ color: 'var(--lime)' }}>0x9c2e…41e1</span></span>
            </div>
          </div>
          <div className="copy">
            <span className="meta" style={{ fontSize: 12 }}>02</span>
            <h3>Upload your allowlist</h3>
            <p className="body">A two-column CSV of names and wallets. The proof tree is built in your browser and only its root goes on-chain. Client lists never touch our servers.</p>
          </div>
        </div>
        <div className="step">
          <div className="well" aria-hidden="true">
            <div className="mini mono" style={{ width: 270, display: 'flex', flexDirection: 'column', gap: 8, padding: 16, fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>
              <span>joe.acme.rwa-id.eth</span>
              <span style={{ display: 'flex', justifyContent: 'space-between' }}><span>Claim fee</span><span style={{ color: 'var(--ink)' }}>Sponsored</span></span>
              <span style={{ marginTop: 4, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'var(--lime)', fontWeight: 700, color: 'var(--ink)' }}>Claim this name</span>
            </div>
          </div>
          <div className="copy">
            <span className="meta" style={{ fontSize: 12 }}>03</span>
            <h3>Clients claim with one link</h3>
            <p className="body">Share the claim link by email or in your app. Their wallet is detected automatically and the name is theirs in one step, or deliver it to them yourself.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ForPlatforms() {
  return (
    <section id="platforms" className="section" data-screen-label="For platforms">
      <div className="section-head center">
        <span className="kicker">For platforms</span>
        <h2 className="h2-lg">Identity that pays for itself.</h2>
      </div>
      <div className="duo">
        <div>
          <div className="visual" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)', padding: '0 28px 60px' }}>
            <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', transform: 'scale(var(--flow-scale, 1))' }} className="flow">
              <span className="mono" style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,.07)', fontSize: 12, color: '#fff', whiteSpace: 'nowrap' }}>Claim · 1.00 USDG</span>
              <span style={{ width: 28, borderTop: '2px solid var(--lime)' }} />
              <span style={{ padding: '14px 18px', borderRadius: 16, background: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>claim()</span>
              <span style={{ position: 'relative', width: 34, alignSelf: 'stretch' }}>
                <span style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '2px solid rgba(255,255,255,.35)' }} />
                <span style={{ position: 'absolute', right: 0, top: -38, bottom: -38, borderLeft: '2px solid rgba(255,255,255,.35)' }} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
                <span style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 18, borderTop: '2px solid var(--lime)' }} /><span className="flow-chip" style={{ background: 'var(--lime)' }}>70% · your treasury</span></span>
                <span style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 18, borderTop: '2px solid var(--orange)' }} /><span className="flow-chip" style={{ background: 'var(--orange)' }}>30% · protocol</span></span>
              </span>
            </div>
            <div className="mono" style={{ position: 'absolute', bottom: 36, left: 'clamp(24px,4vw,44px)', display: 'flex', flexWrap: 'wrap', gap: '4px 28px', fontSize: 11, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--steel)' }}>
              <span>Minimum fee: 0.50 USDG</span><span style={{ color: 'var(--lime)' }}>Split enforced on-chain</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 8px' }}>
            <span className="kicker faint">Revenue on every claim, or sponsor it</span>
            <p className="statement">
              Set any claim fee in USDG and 70% lands in your treasury the moment a client claims. Or fund a sponsor
              pool so clients claim free: you only ever pay the protocol’s 30%.
            </p>
          </div>
        </div>
        <div>
          <div className="visual" style={{ background: 'var(--ink-2)', padding: '44px 0 0 clamp(20px,4vw,44px)' }}>
            <div aria-hidden="true" style={{ height: 300, display: 'flex', overflow: 'hidden', borderRadius: '20px 0 0 20px' }}>
              <div style={{ width: 'clamp(96px,22%,130px)', flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around', background: '#fff', padding: '14px 0' }}>
                <span className="toggle on" style={{ pointerEvents: 'none' }}><i /></span>
                <span className="toggle on" style={{ pointerEvents: 'none' }}><i /></span>
                <span className="toggle" style={{ pointerEvents: 'none' }}><i /></span>
                <span className="mono" style={{ width: 64, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: 'var(--orange)', boxShadow: 'var(--ring-ink)', fontSize: 10, fontWeight: 700 }}>REVOKED</span>
              </div>
              <div className="mono" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', background: 'var(--ink-deep)', padding: '14px 16px 14px clamp(16px,4vw,32px)', fontSize: 'clamp(14px,1.6vw,18px)', fontWeight: 500, letterSpacing: '.03em', color: '#fff' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>joe.acme.rwa-id.eth</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>treasury.acme.rwa-id.eth</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--faint)' }}>ana.acme.rwa-id.eth · soulbound</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--faint)', textDecoration: 'line-through' }}>old.acme.rwa-id.eth</span>
              </div>
            </div>
            <a href="/console" onClick={linkTo} className="btn btn-ghost-ink" style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', height: 52, borderRadius: 16, fontFamily: 'var(--f-sans)', fontSize: 18, fontWeight: 600 }}>Manage identities</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 8px' }}>
            <span className="kicker faint">You set the rules</span>
            <p className="statement">
              Soulbound or transferable per project, overridable per token. Your own artwork on every name, and
              revocation the day a client offboards: a revoked name can never be re-claimed.
            </p>
          </div>
        </div>
      </div>
      <div className="row" style={{ marginTop: 36, justifyContent: 'center', gap: 12 }}>
        <a href="/console" onClick={linkTo} className="btn btn-ink" style={{ height: 54, padding: '0 28px' }}>Register a namespace</a>
        <a href={`mailto:${CONTACT}`} className="btn" style={{ height: 54 }}>Talk to partnerships →</a>
      </div>
    </section>
  )
}

function Reserved() {
  return (
    <section id="reserved" className="section" data-screen-label="Reserved">
      <div className="section-head">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="kicker">Reserved namespaces</span>
          <h2 className="h2" style={{ maxWidth: 760 }}>{RESERVED_COUNT} platform names, held for their owners.</h2>
        </div>
        <p className="body">
          Locked against squatters until {RESERVED_UNTIL}. If one is yours, the multisig assigns it to your wallet.
          Every other slug is open now.
        </p>
      </div>
      <div className="reserved">
        {RESERVED.groups.map(g => (
          <div key={g.group} className="reserved-card">
            <span className="kicker faint" style={{ fontSize: 11 }}>{g.group}</span>
            <ul>
              {g.names.map(n => (
                <li key={n.slug} title={`${n.company} · ${n.domain}`}>
                  <img src={`/reserved/${n.logo}`} alt="" loading="lazy" width="26" height="26" />
                  <b>{n.slug}</b>
                  <small>{n.company}</small>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="disclaimer">{RESERVED.disclaimer}</p>
    </section>
  )
}

function Standards() {
  return (
    <section id="standards" className="section" data-screen-label="Standards">
      <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <span className="kicker">Built on open standards</span>
        <h2 className="h2" style={{ maxWidth: 820 }}>Infrastructure, not a walled garden.</h2>
      </div>
      <div className="duo">
        <div className="exhibit" style={{ boxShadow: 'var(--ring-orange)' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="kicker faint" style={{ fontSize: 11 }}>Settlement · 2026</span>
            <span className="tag"><img src="/chains/robinhood.svg" alt="" width="14" height="14" />Robinhood Chain</span>
          </div>
          <h3>The registry now lives where tokenized assets trade.</h3>
          <p className="body">Claims, fees and revocations settle on Robinhood Chain for a fraction of a cent. Names still resolve through ENS, so nothing changes for the wallet on the other end.</p>
          <a className="more" href={explorerAddress(RWAID_ADDRESS)} target="_blank" rel="noreferrer">View the contract ↗</a>
        </div>
        <div className="exhibit" style={{ boxShadow: 'var(--ring-lime)' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="kicker faint" style={{ fontSize: 11 }}>Resolution</span>
            <span className="tag">ENS · EIP-3668</span>
          </div>
          <h3>Every answer is signed and verified on-chain.</h3>
          <p className="body">A wildcard ENS resolver asks the CCIP-Read gateway, which reads the registry and signs the result. Transfers are reflected instantly, with no re-registration.</p>
          <a className="more" href={GITHUB} target="_blank" rel="noreferrer">Read the source on GitHub ↗</a>
        </div>
      </div>
      <p className="disclaimer">
        RWA ID is identity infrastructure only. It does not collect personal data, perform KYC, assert identity claims or custody assets.
      </p>
    </section>
  )
}

function Cta() {
  return (
    <div className="inset" style={{ paddingTop: 'clamp(72px,9vw,120px)' }}>
      <section className="cta-band">
        <span className="rings" aria-hidden="true"><span className="r1" /><span className="r2" /></span>
        <div style={{ position: 'relative' }}>
          <span className="kicker on-ink">Free to register</span>
          <h2 className="display">Your clients deserve<br /><span>a name.</span></h2>
        </div>
        <a href="/console" onClick={linkTo} className="btn btn-lime" style={{ position: 'relative', height: 54, padding: '0 28px', fontSize: 13 }}>Register a namespace →</a>
      </section>
    </div>
  )
}

export default function Home() {
  useEffect(() => {
    document.title = 'RWA ID — One name, every client'
    const id = window.location.hash.slice(1)
    if (id) document.getElementById(id)?.scrollIntoView()
  }, [])

  return (
    <>
      <SiteHeader />
      <main style={{ position: 'relative' }}>
        <div className="page-grid" aria-hidden="true"><div /><div /><div /><div /><div /></div>
        <Hero />
        <Standard />
        <Wallets />
        <HowItWorks />
        <ForPlatforms />
        <Reserved />
        <Standards />
        <Cta />
      </main>
      <SiteFooter />
    </>
  )
}
