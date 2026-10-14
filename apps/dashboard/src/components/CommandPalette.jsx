import { useEffect, useMemo, useRef, useState } from 'react'
import { NAV } from './Console'

export default function CommandPalette({ onClose, projects, hasProject, go, onGuide }) {
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const items = useMemo(() => {
    const pages = NAV.flatMap(g => g.items).map(([id, label]) => ({ group: 'Page', label, run: () => go(id) }))
    const list = [
      { group: 'Go', label: 'All projects', run: () => go('projects', null) },
      { group: 'Go', label: 'Register a namespace', run: () => go('create', null) },
      ...(hasProject ? pages : []),
      ...projects.map(p => ({ group: 'Project', label: `${p.slug}.rwa-id.eth`, run: () => go('overview', p.id) })),
      { group: 'Help', label: 'Setup guide', run: onGuide },
    ]
    const needle = q.trim().toLowerCase()
    return needle ? list.filter(i => i.label.toLowerCase().includes(needle) || i.group.toLowerCase().includes(needle)) : list
  }, [q, projects, hasProject, go, onGuide])

  useEffect(() => { setCursor(0) }, [q])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, items.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); items[cursor]?.run() }
  }

  return (
    <div className="palette-wrap" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="overlay" onClick={onClose} />
      <div className="palette">
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
          placeholder="Jump to a page or project…" aria-label="Search commands" />
        <div className="list">
          {items.length === 0 ? <p className="note" style={{ padding: 12 }}>No matches for “{q}”.</p> : items.map((item, i) => (
            <button key={`${item.group}-${item.label}`} className={`item${i === cursor ? ' on' : ''}`} onMouseEnter={() => setCursor(i)} onClick={item.run}>
              <span className={`node ${item.group === 'Project' ? 'lime' : item.group === 'Help' ? 'orange' : 'ink'}`} />
              {item.label}<small>{item.group}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
