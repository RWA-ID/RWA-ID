import { useEffect } from 'react'
import { DOCS_SECTIONS, DOCS_UPDATED, DOCS_VERSION } from '../lib/docsContent'
import { RWAID_ADDRESS } from '../lib/contracts'
import { EXPLORER, explorerAddress } from '../lib/chain'
import { linkTo } from '../lib/nav'
import { SiteFooter, SiteHeader } from './SiteChrome'

// Addresses on Ethereum link to Etherscan; everything else to Robinhood Chain's explorer.
const ETHEREUM_ROWS = ['Wildcard resolver', 'RWAIDv3 (legacy)']

function Block({ block }) {
  switch (block.t) {
    case 'p': return <p>{block.text}</p>
    case 'list': return <ul>{block.items.map(i => <li key={i}>{i}</li>)}</ul>
    case 'steps':
      return <ol>{block.items.map(s => <li key={s.h}><b>{s.h}.</b> {s.p}</li>)}</ol>
    case 'code':
      return (
        <figure style={{ margin: '0 0 16px' }}>
          {block.caption && <figcaption className="label" style={{ marginBottom: 8 }}>{block.caption}</figcaption>}
          <pre><code>{block.lines.join('\n')}</code></pre>
        </figure>
      )
    case 'table':
      return (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr>{block.head.map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {block.rows.map(row => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td key={i}>
                      {i === 1 && /^0x[0-9a-fA-F]{40}$/.test(cell)
                        ? <a href={ETHEREUM_ROWS.includes(row[0]) ? `https://etherscan.io/address/${cell}` : `${EXPLORER}/address/${cell}`} target="_blank" rel="noreferrer"><code>{cell}</code></a>
                        : i === 0 ? <b>{cell}</b> : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'dl':
      return <dl>{block.items.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
    case 'note':
      return (
        <div className={`notice ${block.tone === 'warn' ? 'warn' : 'good'}`} style={{ margin: '0 0 16px' }}>
          <span className="n-icon">{block.tone === 'warn' ? '!' : 'i'}</span><span>{block.text}</span>
        </div>
      )
    default: return null
  }
}

export default function DocsPage() {
  useEffect(() => {
    document.title = `Docs · RWA ID ${DOCS_VERSION}`
    const id = window.location.hash.slice(1)
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView(), 0)
  }, [])

  return (
    <>
      <SiteHeader />
      <div className="prose-wrap">
        <div className="docs-layout">
          <nav className="docs-toc" aria-label="On this page">
            <span className="label" style={{ padding: '4px 10px 8px' }}>On this page</span>
            {DOCS_SECTIONS.map(s => <a key={s.id} href={`#${s.id}`}>{s.title}</a>)}
          </nav>
          <article className="prose" style={{ maxWidth: 'none', margin: 0 }}>
            <span className="kicker">Registry {DOCS_VERSION} · Robinhood Chain · updated {DOCS_UPDATED}</span>
            <h1>Documentation</h1>
            <p className="lede">
              Everything needed to issue, resolve and administer RWA ID names against the registry at{' '}
              <a href={explorerAddress(RWAID_ADDRESS)} target="_blank" rel="noreferrer"><code>{RWAID_ADDRESS}</code></a>.
            </p>
            {DOCS_SECTIONS.map(section => (
              <section key={section.id} id={section.id} style={{ scrollMarginTop: 96 }}>
                <h2>{section.title}</h2>
                {section.lede && <p style={{ color: 'var(--ink)', fontWeight: 500 }}>{section.lede}</p>}
                {section.blocks.map((b, i) => <Block key={i} block={b} />)}
              </section>
            ))}
            <div className="row" style={{ marginTop: 40 }}>
              <a href="/console" onClick={linkTo} className="btn btn-lime btn-lg">Open the console →</a>
            </div>
          </article>
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
