import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDisconnect } from 'wagmi'
import { modal } from '../lib/wagmi'
import { RWAID_ADDRESS } from '../lib/contracts'
import { useProjects } from '../lib/useProjects'
import { initials, shortAddress } from '../lib/format'
import {
  ChevronUpDown, Coin, Disconnect, External, Grid, Help,
  List, Lock, Pause, Person, Refresh, Search, Vault, Warning,
} from './icons'

import ProjectsScreen    from './screens/ProjectsScreen'
import CreateProject     from './screens/CreateProject'
import OverviewScreen    from './screens/OverviewScreen'
import AllowlistScreen   from './screens/AllowlistScreen'
import ClaimFeeScreen    from './screens/ClaimFeeScreen'
import TreasuryScreen    from './screens/TreasuryScreen'
import TransferabilityScreen from './screens/TransferabilityScreen'
import AvailabilityScreen from './screens/AvailabilityScreen'
import RegistryScreen    from './screens/RegistryScreen'
import OwnershipScreen   from './screens/OwnershipScreen'
import SetupGuide        from './SetupGuide'
import CommandPalette    from './CommandPalette'

const PROJECT_NAV = [
  { id: 'overview',   label: 'Overview',              Icon: Grid },
  { id: 'allowlist',  label: 'Allowlist',             Icon: List },
  { id: 'fee',        label: 'Claim fee',             Icon: Coin },
  { id: 'treasury',   label: 'Treasury',              Icon: Vault },
  { id: 'xfer',       label: 'Transferability',       Icon: Lock },
  { id: 'pause',      label: 'Availability',          Icon: Pause },
]
const IDENTITY_NAV = [
  { id: 'registry',   label: 'Registry & revocation', Icon: Search },
]
const ADMIN_NAV = [
  { id: 'ownership',  label: 'Ownership',             Icon: Person },
]

const CRUMBS = {
  projects: 'All projects', create: 'New project', overview: null,
  allowlist: 'Allowlist', fee: 'Claim fee', treasury: 'Treasury',
  xfer: 'Transferability', pause: 'Availability',
  registry: 'Registry & revocation', ownership: 'Ownership',
}

export default function Console({ address }) {
  const { disconnect } = useDisconnect()
  const { projects, loading, error, logError, protocolFeePercent, reload } = useProjects(address)

  const [screen, setScreen]   = useState('projects')
  const [pid, setPid]         = useState(null)
  const [guide, setGuide]     = useState(false)
  const [palette, setPalette] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [freshness, setFreshness] = useState(Date.now())

  const project = useMemo(
    () => projects.find(p => p.id === pid) ?? null,
    [projects, pid],
  )

  // A project that disappears (ownership transferred away) must not strand the UI.
  useEffect(() => {
    if (pid != null && !loading && !project) { setPid(null); setScreen('projects') }
  }, [pid, loading, project])

  const go = useCallback((next, nextPid) => {
    if (nextPid !== undefined) setPid(nextPid)
    setScreen(next)
    setPalette(false)
    setSwitching(false)
    window.scrollTo({ top: 0 })
  }, [])

  const refresh = useCallback(async () => {
    await reload()
    setFreshness(Date.now())
  }, [reload])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(p => !p)
      }
      if (e.key === 'Escape') { setPalette(false); setSwitching(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleDisconnect = async () => {
    try { await modal.disconnect() } catch { /* AppKit may already be closed */ }
    try { disconnect() } catch { /* wagmi connector already gone */ }
  }

  const screenProps = { project, projectId: pid, go, refresh, address, protocolFeePercent }
  const inProject = pid != null && project

  const renderScreen = () => {
    switch (screen) {
      case 'create':    return <CreateProject address={address} go={go} onCreated={refresh} protocolFeePercent={protocolFeePercent} />
      case 'overview':  return inProject ? <OverviewScreen {...screenProps} /> : null
      case 'allowlist': return inProject ? <AllowlistScreen {...screenProps} /> : null
      case 'fee':       return inProject ? <ClaimFeeScreen {...screenProps} /> : null
      case 'treasury':  return inProject ? <TreasuryScreen {...screenProps} /> : null
      case 'xfer':      return inProject ? <TransferabilityScreen {...screenProps} /> : null
      case 'pause':     return inProject ? <AvailabilityScreen {...screenProps} /> : null
      case 'registry':  return inProject ? <RegistryScreen {...screenProps} /> : null
      case 'ownership': return inProject ? <OwnershipScreen {...screenProps} /> : null
      default:
        return (
          <ProjectsScreen
            projects={projects} loading={loading} error={error}
            go={go} onRetry={refresh} protocolFeePercent={protocolFeePercent}
          />
        )
    }
  }

  const crumb = screen === 'overview' ? (project?.slug ?? 'Project') : CRUMBS[screen] ?? 'Console'

  const navSection = (items) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`nav-item${screen === id ? ' is-active' : ''}`}
          onClick={() => go(id)}
        >
          <Icon size={14} />{label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="console">
      <aside className="sidebar">
        <div style={{ padding: '18px 16px 14px', position: 'relative' }}>
          <div className="sidebar-brand">
            <span className="brand-mark">R</span>
            <span className="brand-word">RWA·ID</span>
            <span className="brand-tag">CONSOLE</span>
          </div>

          <button className="project-switch" onClick={() => (projects.length ? setSwitching(s => !s) : go('create'))}>
            <span className="initials" style={{ background: project ? 'var(--accent)' : 'rgba(255,255,255,.12)' }}>
              {project ? initials(project.slug) : '··'}
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span className="name">{project ? project.slug : 'All projects'}</span>
              <span className="sub">
                {project ? `${project.slug}.rwa-id.eth` : `${projects.length} namespace${projects.length === 1 ? '' : 's'}`}
              </span>
            </span>
            <ChevronUpDown size={12} style={{ flex: 'none', color: 'rgba(244,244,242,.45)' }} />
          </button>

          {switching && (
            <div className="switcher">
              <button className="switcher-item" onClick={() => go('projects', null)}>
                <span className="switcher-initials">··</span>
                <span className="switcher-name">All projects</span>
              </button>
              {projects.map(p => (
                <button key={p.id} className="switcher-item" onClick={() => go('overview', p.id)}>
                  <span className="switcher-initials">{initials(p.slug)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="switcher-name">{p.slug}</span>
                    <span className="switcher-sub">#{p.id} · {p.active ? 'Active' : 'Paused'}</span>
                  </span>
                </button>
              ))}
              <button className="switcher-item accent" onClick={() => go('create', null)}>
                <span className="switcher-initials">+</span>
                <span className="switcher-name">Register a namespace</span>
              </button>
            </div>
          )}
        </div>

        <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {inProject ? (
            <>
              <div>
                <div className="nav-group-label">Project</div>
                {navSection(PROJECT_NAV)}
              </div>
              <div>
                <div className="nav-group-label">Identities</div>
                {navSection(IDENTITY_NAV)}
              </div>
              <div>
                <div className="nav-group-label">Administration</div>
                {navSection(ADMIN_NAV)}
                <button className="nav-item" onClick={() => setGuide(true)}>
                  <Help size={14} />Setup guide
                </button>
              </div>
            </>
          ) : (
            <div>
              <div className="nav-group-label">Console</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button className={`nav-item${screen === 'projects' ? ' is-active' : ''}`} onClick={() => go('projects', null)}>
                  <Grid size={14} />All projects
                </button>
                <button className={`nav-item${screen === 'create' ? ' is-active' : ''}`} onClick={() => go('create', null)}>
                  <Person size={14} />Register a namespace
                </button>
                <button className="nav-item" onClick={() => setGuide(true)}>
                  <Help size={14} />Setup guide
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-foot">
          <div className="wallet-card">
            <span className="avatar" />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="addr">{shortAddress(address)}</span>
              <span className="net"><span className="dot" />Ethereum mainnet</span>
            </span>
            <button className="shell-icon-btn" onClick={handleDisconnect} title="Disconnect" aria-label="Disconnect wallet">
              <Disconnect size={13} />
            </button>
          </div>
          <button className="cmd-trigger" onClick={() => setPalette(true)}>
            Search &amp; commands <span className="kbd" style={{ marginLeft: 'auto' }}>⌘K</span>
          </button>
        </div>
      </aside>

      <div className="console-main">
        <div className="topbar">
          <div className="crumbs">
            <button onClick={() => go('projects', null)}>Projects</button>
            <span className="sep">/</span>
            <span className="current">{crumb}</span>
          </div>
          <div className="row" style={{ marginLeft: 'auto' }}>
            <span className="freshness">
              <span className="dot" />read from mainnet
            </span>
            <button className="btn btn-sm" onClick={refresh} disabled={loading}>
              <Refresh size={12} />{loading ? 'Reading…' : 'Refresh'}
            </button>
            <a className="btn btn-sm" href={`https://etherscan.io/address/${RWAID_ADDRESS}`} target="_blank" rel="noreferrer">
              <External size={12} />Etherscan
            </a>
          </div>
        </div>

        <div className="console-content">
          <div className="console-inner" key={`${screen}-${pid}-${freshness}`}>
            {logError && (
              <div className="notice notice-warn" style={{ marginBottom: 20 }}>
                <Warning size={15} />
                <span>
                  Contract events are unavailable, so allowlist counts and activity are missing.
                  Storage-backed figures (claims, revenue, fees) are unaffected. {logError}
                </span>
              </div>
            )}
            {renderScreen()}
          </div>
        </div>
      </div>

      {guide && <SetupGuide onClose={() => setGuide(false)} />}
      {palette && (
        <CommandPalette
          onClose={() => setPalette(false)}
          projects={projects}
          hasProject={!!inProject}
          go={go}
          onGuide={() => { setPalette(false); setGuide(true) }}
        />
      )}
      {switching && <div className="switcher-scrim" onClick={() => setSwitching(false)} />}
    </div>
  )
}
