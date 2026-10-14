import { useEffect } from 'react'
import { LEGAL_CONTACT, LEGAL_DOCS, LEGAL_ENTITY_DBA, LEGAL_ORDER, LEGAL_UPDATED } from '../lib/legalContent'
import { RWAID_ADDRESS } from '../lib/contracts'
import { explorerAddress } from '../lib/chain'
import { linkTo } from '../lib/nav'
import { SiteFooter, SiteHeader } from './SiteChrome'

export default function LegalPage({ doc }) {
  const content = LEGAL_DOCS[doc]
  useEffect(() => { if (content) document.title = `${content.title} · RWA ID` }, [content])
  if (!content) return null

  return (
    <>
      <SiteHeader />
      <div className="prose-wrap">
        <article className="prose">
          <nav className="prose-nav" aria-label="Legal documents">
            {LEGAL_ORDER.map(slug => (
              <a key={slug} href={`/${slug}`} onClick={linkTo} className={`btn btn-sm${slug === doc ? ' btn-ink' : ''}`}>{LEGAL_DOCS[slug].title}</a>
            ))}
          </nav>
          <span className="kicker">Last updated {LEGAL_UPDATED}</span>
          <h1>{content.title}</h1>
          <p className="lede">{content.lede}</p>
          {content.sections.map(section => (
            <section key={section.h} className={section.important ? 'important' : undefined}>
              <h2>{section.h}</h2>
              {section.important && <p><b>Read this section before you sign anything.</b></p>}
              {section.p?.map((para, i) => <p key={i}>{para}</p>)}
              {section.list && <dl>{section.list.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>}
            </section>
          ))}
          <p className="meta" style={{ marginTop: 40 }}>
            {LEGAL_ENTITY_DBA} · <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a> · registry{' '}
            <a href={explorerAddress(RWAID_ADDRESS)} target="_blank" rel="noreferrer">{RWAID_ADDRESS}</a> on Robinhood Chain
          </p>
        </article>
      </div>
      <SiteFooter />
    </>
  )
}
