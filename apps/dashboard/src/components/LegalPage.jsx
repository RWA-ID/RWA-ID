import { useEffect } from 'react'
import '../landing.css'
import { LEGAL_CONTACT, LEGAL_DOCS, LEGAL_ENTITY, LEGAL_ORDER, LEGAL_UPDATED } from '../lib/legalContent'
import { RWAID_ADDRESS } from '../lib/contracts'
import { shortAddress } from '../lib/format'
import { ArrowLeft, Warning } from './icons'

export default function LegalPage({ doc, onHome }) {
  const content = LEGAL_DOCS[doc]

  useEffect(() => {
    if (content) document.title = `${content.title} · RWA-ID`
  }, [content])

  if (!content) return null

  const goto = (slug) => {
    window.history.pushState({}, '', `/${slug}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="landing">
      <nav className="l-nav">
        <button className="l-brand" onClick={onHome}>
          <span className="l-brand-mark">R</span>
          <span className="l-brand-word">RWA·ID</span>
        </button>
        <div className="l-nav-links">
          {LEGAL_ORDER.map(slug => (
            <button
              key={slug}
              className="l-nav-pill"
              style={slug === doc ? { background: 'var(--ink)', color: 'var(--page)', borderColor: 'var(--ink)' } : undefined}
              onClick={() => goto(slug)}
            >
              {LEGAL_DOCS[slug].title}
            </button>
          ))}
        </div>
      </nav>

      <article className="legal">
        <button className="back-link" style={{ marginBottom: 24 }} onClick={onHome}>
          <ArrowLeft size={12} />Back to RWA-ID
        </button>

        <div className="mono-label" style={{ marginBottom: 16 }}>Last updated {LEGAL_UPDATED}</div>
        <h1 className="display-2" style={{ marginBottom: 18 }}>{content.title}</h1>
        <p className="lede" style={{ maxWidth: 640, marginBottom: 40 }}>{content.lede}</p>

        {content.sections.map(section => (
          <section key={section.h} className={`legal-section${section.important ? ' is-important' : ''}`}>
            <h2 className="legal-h">{section.h}</h2>
            {section.important && (
              <div className="notice notice-warn" style={{ marginBottom: 16 }}>
                <Warning size={15} />
                <span>Read this section before you sign anything.</span>
              </div>
            )}
            {section.p?.map((para, i) => <p key={i} className="legal-p">{para}</p>)}
            {section.list && (
              <dl className="legal-dl">
                {section.list.map(([term, def]) => (
                  <div key={term} className="legal-dl-row">
                    <dt>{term}</dt>
                    <dd>{def}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        ))}

        <div className="legal-foot">
          <p className="legal-p" style={{ margin: 0 }}>
            {LEGAL_ENTITY} · <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a> ·{' '}
            <a href={`https://etherscan.io/address/${RWAID_ADDRESS}`} target="_blank" rel="noreferrer">
              registry {shortAddress(RWAID_ADDRESS)}
            </a>
          </p>
        </div>
      </article>

      <footer className="l-footer">
        <div className="l-footer-bottom" style={{ borderTop: 0, paddingTop: 0 }}>
          <span>© {new Date().getFullYear()} {LEGAL_ENTITY}</span>
          <div className="l-footer-bottom-right">
            {LEGAL_ORDER.filter(s => s !== doc).map(slug => (
              <button key={slug} onClick={() => goto(slug)} style={{ font: 'inherit', color: 'var(--mute-3)' }}>
                {LEGAL_DOCS[slug].title}
              </button>
            ))}
            <button onClick={onHome} style={{ font: 'inherit', color: 'var(--mute-3)' }}>Home</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
