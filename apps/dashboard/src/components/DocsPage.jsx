import { useEffect, useState } from 'react'
import '../landing.css'
import { DOCS_SECTIONS, DOCS_UPDATED, DOCS_VERSION } from '../lib/docsContent'
import { RWAID_ADDRESS } from '../lib/contracts'
import { shortAddress } from '../lib/format'
import { ArrowLeft, ArrowRight, Check, External, Info, Warning } from './icons'
import { CONTACT_EMAIL, GITHUB_URL, REGISTRY_URL, WHITEPAPER_URL } from './Landing'

function Block({ block }) {
  switch (block.t) {
    case 'p':
      return <p className="legal-p">{block.text}</p>

    case 'list':
      return (
        <ul className="l-list docs-list">
          {block.items.map(item => <li key={item}><Check size={13} />{item}</li>)}
        </ul>
      )

    case 'steps':
      return (
        <ol className="docs-steps">
          {block.items.map((step, i) => (
            <li key={step.h}>
              <span className="docs-step-n">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h4 className="docs-step-h">{step.h}</h4>
                <p className="legal-p">{step.p}</p>
              </div>
            </li>
          ))}
        </ol>
      )

    case 'code':
      return (
        <figure className="docs-code">
          {block.caption && <figcaption className="mono-label">{block.caption}</figcaption>}
          <pre className="l-code">{block.lines.join('\n')}</pre>
        </figure>
      )

    case 'table':
      return (
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead>
              <tr>{block.head.map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map(row => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td key={i} className={i === 1 ? 'is-addr' : undefined}>
                      {i === 1 && /^0x[0-9a-fA-F]{40}$/.test(cell)
                        ? <a href={`https://etherscan.io/address/${cell}`} target="_blank" rel="noreferrer">
                            {cell}<External size={11} />
                          </a>
                        : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'dl':
      return (
        <dl className="legal-dl">
          {block.items.map(([term, def]) => (
            <div key={term} className="legal-dl-row">
              <dt>{term}</dt>
              <dd>{def}</dd>
            </div>
          ))}
        </dl>
      )

    case 'note':
      return (
        <div className={`notice ${block.tone === 'warn' ? 'notice-warn' : 'notice-accent'} docs-note`}>
          {block.tone === 'warn' ? <Warning size={15} /> : <Info size={15} />}
          <span>{block.text}</span>
        </div>
      )

    default:
      return null
  }
}

export default function DocsPage({ onHome, onConnect }) {
  const [active, setActive] = useState(DOCS_SECTIONS[0].id)

  useEffect(() => {
    document.title = `Documentation · RWA-ID ${DOCS_VERSION}`
  }, [])

  // Light-touch scrollspy: whichever heading is nearest the top of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    )
    DOCS_SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const jump = (e, id) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState({}, '', `/docs#${id}`)
  }

  return (
    <div className="landing">
      <nav className="l-nav">
        <button className="l-brand" onClick={onHome}>
          <span className="l-brand-mark">R</span>
          <span className="l-brand-word">RWA·ID</span>
        </button>
        <div className="l-nav-links">
          <a className="l-nav-pill" href={WHITEPAPER_URL} target="_blank" rel="noreferrer">Whitepaper</a>
          <a className="l-nav-pill" href={REGISTRY_URL} target="_blank" rel="noreferrer">Contract</a>
          <button className="l-connect" onClick={onConnect}>
            <span className="l-connect-dot" />Connect wallet
          </button>
        </div>
      </nav>

      <div className="docs">
        <aside className="docs-side">
          <div className="docs-side-inner">
            <div className="mono-label" style={{ marginBottom: 14 }}>On this page</div>
            <nav className="docs-toc">
              {DOCS_SECTIONS.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`docs-toc-link${s.id === active ? ' is-active' : ''}`}
                  onClick={e => jump(e, s.id)}
                >
                  {s.title}
                </a>
              ))}
            </nav>
            <div className="docs-side-foot">
              <a href={WHITEPAPER_URL} target="_blank" rel="noreferrer">Whitepaper<External size={11} /></a>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">Contracts on GitHub<External size={11} /></a>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </div>
          </div>
        </aside>

        <article className="docs-body">
          <button className="back-link" style={{ marginBottom: 24 }} onClick={onHome}>
            <ArrowLeft size={12} />Back to RWA-ID
          </button>

          <div className="docs-head">
            <div className="mono-label">Registry {DOCS_VERSION} · live on Ethereum mainnet · updated {DOCS_UPDATED}</div>
            <h1 className="display-2" style={{ margin: '16px 0 18px' }}>Documentation</h1>
            <p className="lede" style={{ maxWidth: 660 }}>
              Everything needed to issue, resolve and administer RWA-ID identities against the {DOCS_VERSION}{' '}
              registry at <a className="docs-inline-link" href={REGISTRY_URL} target="_blank" rel="noreferrer">
                {shortAddress(RWAID_ADDRESS, 6, 4)}
              </a>.
            </p>
          </div>

          {DOCS_SECTIONS.map(section => (
            <section key={section.id} id={section.id} className="docs-section">
              <h2 className="docs-h">{section.title}</h2>
              {section.lede && <p className="docs-lede">{section.lede}</p>}
              {section.blocks.map((block, i) => <Block key={i} block={block} />)}
            </section>
          ))}

          <div className="docs-cta">
            <div>
              <h3 className="l-card-title">Ready to issue?</h3>
              <p className="legal-p" style={{ margin: 0 }}>
                Connect a wallet to create your namespace. Read-only until you sign.
              </p>
            </div>
            <button className="btn btn-accent btn-lg" onClick={onConnect}>
              Connect wallet<ArrowRight size={15} width={1.6} />
            </button>
          </div>
        </article>
      </div>

      <footer className="l-footer">
        <div className="l-footer-bottom" style={{ borderTop: 0, paddingTop: 0 }}>
          <span>© {new Date().getFullYear()} RWA-ID Labs</span>
          <div className="l-footer-bottom-right">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/refunds">Refunds</a>
            <a href={REGISTRY_URL} target="_blank" rel="noreferrer">{shortAddress(RWAID_ADDRESS, 6, 5)}</a>
            <button onClick={onHome} style={{ font: 'inherit', color: 'var(--mute-3)' }}>Home</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
