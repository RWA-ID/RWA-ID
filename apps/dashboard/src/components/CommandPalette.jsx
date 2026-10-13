import { useEffect, useMemo, useRef, useState } from 'react'
import { initials } from '../lib/format'
import { ChevronRight, Search } from './icons'

const PROJECT_PAGES = [
  { id: 'overview',  label: 'Overview' },
  { id: 'allowlist', label: 'Allowlist' },
  { id: 'fee',       label: 'Claim fee' },
  { id: 'treasury',  label: 'Treasury' },
  { id: 'xfer',      label: 'Transferability' },
  { id: 'pause',     label: 'Availability' },
  { id: 'registry',  label: 'Registry & revocation' },
  { id: 'ownership', label: 'Ownership' },
]

export default function CommandPalette({ onClose, projects, hasProject, go, onGuide }) {
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const items = useMemo(() => {
    const list = [
      { group: 'Go', label: 'All projects', run: () => go('projects', null) },
      { group: 'Go', label: 'Register a namespace', run: () => go('create', null) },
      ...(hasProject ? PROJECT_PAGES.map(p => ({ group: 'Page', label: p.label, run: () => go(p.id) })) : []),
      ...projects.map(p => ({
        group: 'Project',
        label: `${p.slug}.rwa-id.eth`,
        badge: initials(p.slug),
        run: () => go('overview', p.id),
      })),
      { group: 'Help', label: 'Setup guide', run: onGuide },
    ]
    const needle = q.trim().toLowerCase()
    if (!needle) return list
    return list.filter(i => i.label.toLowerCase().includes(needle) || i.group.toLowerCase().includes(needle))
  }, [q, projects, hasProject, go, onGuide])

  // Keep the highlight inside the filtered list.
  useEffect(() => { setCursor(0) }, [q])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, items.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); items[cursor]?.run() }
  }

  return (
    <div className="palette-wrap" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="overlay" onClick={onClose} />
      <div className="palette">
        <div className="palette-input">
          <Search size={15} style={{ color: 'var(--faint)', flex: 'none' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a page or project…"
            aria-label="Search commands"
          />
          <span className="kbd" style={{ borderColor: 'var(--hairline)', color: 'var(--faint)' }}>ESC</span>
        </div>
        <div className="palette-list">
          {items.length === 0 ? (
            <div className="palette-empty">No matches for “{q}”.</div>
          ) : items.map((item, i) => (
            <button
              key={`${item.group}-${item.label}`}
              className={`palette-item${i === cursor ? ' is-cursor' : ''}`}
              onMouseEnter={() => setCursor(i)}
              onClick={item.run}
            >
              <span className="group">{item.group.toUpperCase()}</span>
              <span className="label">{item.label}</span>
              <ChevronRight size={12} style={{ color: '#C8C9C5', flex: 'none' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
