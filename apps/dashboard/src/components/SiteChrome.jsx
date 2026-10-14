import { useEffect, useState } from 'react'
import { Lockup, RwaMark } from './Brand'
import { CONTACT, GITHUB, WHITEPAPER, X_URL, linkTo } from '../lib/nav'
import { RWAID_ADDRESS } from '../lib/contracts'
import { explorerAddress } from '../lib/chain'

export const MENUS = [
  {
    id: 'platforms', label: 'Platforms', kicker: 'Namespace', title: 'Register your namespace',
    body: 'yourplatform.rwa-id.eth. Free to create, settled on Robinhood Chain.',
    cta: 'Open the console', ctaHref: '/console',
    links: [
      { t: 'Register a namespace', d: 'Free, permissionless, any open slug', href: '/console' },
      { t: 'Upload an allowlist', d: 'A name,wallet CSV. Root on-chain only', href: '/#how' },
      { t: 'Sponsor your clients', d: 'Pre-fund claims so clients pay nothing', href: '/#platforms' },
      { t: 'Reserved namespaces', d: '36 slugs held for their owners', href: '/#reserved' },
    ],
  },
  {
    id: 'clients', label: 'Clients', kicker: 'Claim', title: 'Claim your identity',
    body: 'Got a link from your platform? Your name is waiting for your wallet.',
    cta: 'Claim a name', ctaHref: '/claim',
    links: [
      { t: 'Claim with your link', d: 'Wallet detected automatically', href: '/claim' },
      { t: 'Where it works', d: 'MetaMask, Trust, Rainbow and more', href: '/#wallets' },
      { t: 'Soulbound or transferable', d: 'Set by the platform that issued it', href: '/#platforms' },
      { t: 'What we never collect', d: 'No personal data, no KYC', href: '/#standards' },
    ],
  },
  {
    id: 'developers', label: 'Developers', kicker: 'Protocol', title: 'Read the protocol',
    body: 'ENS wildcard resolver, CCIP-Read gateway, open-source registry.',
    cta: 'Read the docs', ctaHref: '/docs',
    links: [
      { t: 'Docs', d: 'Integration and contract reference', href: '/docs' },
      { t: 'Contracts', d: 'Registry, resolver, protocol Safe', href: '/docs#contracts' },
      { t: 'CCIP-Read gateway', d: 'gateway.rwa-id.com', href: '/docs#resolution' },
      { t: 'GitHub', d: 'RWA-ID/RWA-ID · MIT', href: GITHUB },
    ],
  },
  {
    id: 'company', label: 'Company', kicker: 'Founder', title: 'Built by Hector Morel',
    body: 'Neutral identity infrastructure for the tokenized economy.',
    cta: 'Contact partnerships', ctaHref: `mailto:${CONTACT}`,
    links: [
      { t: 'Whitepaper', d: 'The full design, in one document', href: WHITEPAPER },
      { t: 'Partnerships', d: CONTACT, href: `mailto:${CONTACT}` },
      { t: 'Governance', d: '2-of-3 Safe multisig', href: '/docs#governance' },
      { t: 'Terms & Privacy', d: 'The legal fine print', href: '/terms' },
    ],
  },
]

const ext = (href) => /^https?:/.test(href) ? { target: '_blank', rel: 'noreferrer' } : {}

export function SiteHeader() {
  const [open, setOpen] = useState(null)
  const [drawer, setDrawer] = useState(false)
  const menu = MENUS.find(m => m.id === open)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(null); setDrawer(false) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (e) => { setOpen(null); setDrawer(false); linkTo(e) }

  return (
    <div className="site-head-wrap" onMouseLeave={() => setOpen(null)}>
      <header className="site-head">
        <div className="site-head-inner">
          <Lockup href="/" onClick={go} />
          <nav className="site-nav" aria-label="Main">
            {MENUS.map(m => (
              <button
                key={m.id}
                type="button"
                className={open === m.id ? 'on' : ''}
                aria-expanded={open === m.id}
                onMouseEnter={() => setOpen(m.id)}
                onFocus={() => setOpen(m.id)}
                onClick={() => setOpen(open === m.id ? null : m.id)}
              >
                <i /><span>{m.label}</span>
              </button>
            ))}
          </nav>
          <div className="site-actions">
            <span className="live-chip"><i />Robinhood Chain · live</span>
            <a href="/claim" onClick={go} className="btn claim-cta">Claim a name</a>
            <a href="/console" onClick={go} className="btn btn-lime open-console">Open console</a>
            <button type="button" className="btn menu-btn" aria-expanded={drawer} onClick={() => setDrawer(d => !d)}>
              {drawer ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>
      </header>

      {menu && (
        <div className="mega">
          <div className="mega-inner">
            <a href={menu.ctaHref} onClick={go} className="mega-feature">
              <span className="rings" aria-hidden="true"><span className="r1" /><span className="r2" /><span className="r3" /><span className="r4" /></span>
              <span className="mega-copy">
                <span className="kicker on-ink">{menu.kicker}</span>
                <span className="display">{menu.title}</span>
                <p>{menu.body}</p>
              </span>
              <span className="mega-cta"><b>→</b>{menu.cta}</span>
            </a>
            <div className="mega-links">
              {menu.links.map(l => (
                <a key={l.t} href={l.href} onClick={go} className="mega-link" {...ext(l.href)}>
                  <span><b>{l.t}</b><small>{l.d}</small></span>
                  <span className="arrow-box">→</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {drawer && (
        <nav className="drawer-nav" aria-label="Main">
          {MENUS.map(m => (
            <section key={m.id}>
              <span className="kicker faint">{m.label}</span>
              {m.links.map(l => (
                <a key={l.t} href={l.href} onClick={go} className="mega-link" {...ext(l.href)}>
                  <span><b>{l.t}</b><small>{l.d}</small></span>
                  <span className="arrow-box">→</span>
                </a>
              ))}
            </section>
          ))}
          <a href="/console" onClick={go} className="btn btn-lime btn-lg">Open console</a>
        </nav>
      )}
    </div>
  )
}

const FOOTER = [
  { h: 'Platforms', links: [{ t: 'Register', href: '/console' }, { t: 'How it works', href: '/#how' }, { t: 'Reserved', href: '/#reserved' }] },
  { h: 'Clients', links: [{ t: 'Claim a name', href: '/claim' }, { t: 'Wallets', href: '/#wallets' }] },
  { h: 'Developers', links: [{ t: 'Docs', href: '/docs' }, { t: 'GitHub', href: GITHUB }, { t: 'Whitepaper', href: WHITEPAPER }] },
  { h: 'Legal', links: [{ t: 'Terms', href: '/terms' }, { t: 'Privacy', href: '/privacy' }, { t: 'Refunds', href: '/refunds' }] },
]

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="site-foot-inner">
        <div className="foot-cols">
          {FOOTER.map(c => (
            <div key={c.h}>
              <span>{c.h}</span>
              {c.links.map(l => <a key={l.t} href={l.href} onClick={linkTo} {...ext(l.href)}>{l.t}</a>)}
            </div>
          ))}
          <div>
            <span>Contact</span>
            <a href={`mailto:${CONTACT}`} className="lime">{CONTACT}</a>
            <a href={X_URL} target="_blank" rel="noreferrer" className="lime">@rwaidentity</a>
          </div>
        </div>
        <p className="foot-tag">Identity infrastructure for the tokenized economy</p>
        <p className="foot-legal">
          © {new Date().getFullYear()} Only Buy Bitcoin LLC, doing business as RWA ID. Registry <a href={explorerAddress(RWAID_ADDRESS)} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{RWAID_ADDRESS}</a> on
          Robinhood Chain. RWA ID is not affiliated with Robinhood Markets, Inc. or any company named on this site.
        </p>
        <div className="foot-giant" aria-hidden="true">
          <RwaMark tone="dark" size="0.62em" style={{ height: '.57em', top: '-.04em' }} />
          <b>RWA·ID</b>
        </div>
      </div>
    </footer>
  )
}
