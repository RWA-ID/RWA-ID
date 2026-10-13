import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi'
import { modal } from '../lib/wagmi'
import { RWAID_ADDRESS } from '../lib/contracts'
import { ROBINHOOD_CHAIN_ID, explorerAddress } from '../lib/chain'
import { useProjects } from '../lib/useProjects'
import { initials, shortAddress } from '../lib/format'
import { linkTo } from '../lib/nav'
import { RwaMark, Wordmark, Lockup } from './Brand'

import ProjectsScreen from './screens/ProjectsScreen'
import CreateProject from './screens/CreateProject'
import OverviewScreen from './screens/OverviewScreen'
import AllowlistScreen from './screens/AllowlistScreen'
import ClaimFeeScreen from './screens/ClaimFeeScreen'
import SponsorshipScreen from './screens/SponsorshipScreen'
import TreasuryScreen from './screens/TreasuryScreen'
import ArtworkScreen from './screens/ArtworkScreen'
import TransferabilityScreen from './screens/TransferabilityScreen'
import AvailabilityScreen from './screens/AvailabilityScreen'
import RegistryScreen from './screens/RegistryScreen'
import OwnershipScreen from './screens/OwnershipScreen'
import SetupGuide from './SetupGuide'
import CommandPalette from './CommandPalette'

export const NAV = [
  { group: 'Project', items: [
    ['overview', 'Overview'], ['allowlist', 'Allowlist'], ['fee', 'Claim fee'], ['sponsor', 'Sponsorship', 'v4'],
    ['treasury', 'Treasury'], ['artwork', 'Artwork', 'v4'], ['xfer', 'Transferability'], ['pause', 'Availability'],
  ] },
  { group: 'Identities', items: [['registry', 'Registry & revocation']] },
  { group: 'Administration', items: [['ownership', 'Ownership']] },
]

export const TITLES = {
  projects: 'All projects', create: 'Register a namespace', overview: null, allowlist: 'Allowlist',
  fee: 'Claim fee', sponsor: 'Sponsorship', treasury: 'Treasury', artwork: 'Artwork', xfer: 'Transferability',
  pause: 'Availability', registry: 'Registry & revocation', ownership: 'Ownership',
}

const SCREENS = {
  overview: OverviewScreen, allowlist: AllowlistScreen, fee: ClaimFeeScreen, sponsor: SponsorshipScreen,
  treasury: TreasuryScreen, artwork: ArtworkScreen, xfer: TransferabilityScreen, pause: AvailabilityScreen,
  registry: RegistryScreen, ownership: OwnershipScreen,
}

/** Signed-out console: one card, one button. */
export function ConnectGate() {
  useEffect(() => { document.title = 'Console · RWA ID' }, [])
  return (
    <div className="claim">
      <header className="claim-head"><Lockup href="/" onClick={linkTo} size={26} word={16} /><span className="ns">Console</span></header>
      <main className="claim-main">
        <div className="claim-notice" style={{ maxWidth: 620 }}>
          <span className="sq" style={{ background: 'var(--lime)' }}><RwaMark size={34} tone="light" /></span>
          <h1 className="display">Open the console</h1>
          <p className="lede" style={{ fontSize: 16 }}>
            Connect the wallet that owns your namespace, or the one you want to register it with. Everything here is
            read from and written to Robinhood Chain; there is no account to create.
          </p>
          <button className="btn btn-ink btn-lg" style={{ color: 'var(--lime)' }} onClick={() => modal.open()}>Connect wallet →</button>
          <a href="/" onClick={linkTo} className="meta">← Back to rwa-id.com</a>
        </div>
      </main>
    </div>
  )
}

export default function Console({ address }) {
  const { disconnect } = useDisconnect()
  const { chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const { projects, loading, error, logError, protocolFeePercent, reload } = useProjects(address)

  const [screen, setScreen] = useState('projects')
  const [pid, setPid] = useState(null)
  const [guide, setGuide] = useState(false)
  const [palette, setPalette] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [sideOpen, setSideOpen] = useState(false)
  const [freshness, setFreshness] = useState(Date.now())

  const project = useMemo(() => projects.find(p => p.id === pid) ?? null, [projects, pid])

  // A project that disappears (ownership transferred away) must not strand the UI.
  useEffect(() => {
    if (pid != null && !loading && !project) { setPid(null); setScreen('projects') }
  }, [pid, loading, project])

  useEffect(() => { document.title = `${project ? project.slug : 'Console'} · RWA ID` }, [project])

  const go = useCallback((next, nextPid) => {
    if (nextPid !== undefined) setPid(nextPid)
    setScreen(next)
    setPalette(false)
    setSwitching(false)
    setSideOpen(false)
    window.scrollTo({ top: 0 })
  }, [])

  const refresh = useCallback(async () => { await reload(); setFreshness(Date.now()) }, [reload])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p) }
      if (e.key === 'Escape') { setPalette(false); setSwitching(false); setSideOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleDisconnect = async () => {
    try { await modal.disconnect() } catch { /* AppKit may already be closed */ }
    try { disconnect() } catch { /* wagmi connector already gone */ }
  }

  const inProject = pid != null && !!project
  const screenProps = { project, projectId: pid, go, refresh, address, protocolFeePercent }
  const Screen = SCREENS[screen]
  const wrongChain = chainId !== undefined && chainId !== ROBINHOOD_CHAIN_ID

  const body = screen === 'create'
    ? <CreateProject address={address} go={go} onCreated={refresh} protocolFeePercent={protocolFeePercent} />
    : Screen && inProject
      ? <><ProjectHead project={project} screen={screen} go={go} /><Screen {...screenProps} /></>
      : <ProjectsScreen projects={projects} loading={loading} error={error} go={go} onRetry={refresh} />

  const crumb = screen === 'overview' ? (project?.slug ?? 'Project') : TITLES[screen] ?? 'Console'

  return (
    <div className="console">
      <aside className={`side${sideOpen ? ' open' : ''}`}>
        <div className="side-top">
          <a href="/" onClick={linkTo} className="side-brand">
            <RwaMark size={26} tone="dark" /><Wordmark size={16} /><span className="tag">CONSOLE</span>
          </a>
          <button className="switch" onClick={() => (projects.length ? setSwitching(s => !s) : go('create', null))}>
            <span className={`initials${project ? ' lime' : ''}`}>{project ? initials(project.slug) : '··'}</span>
            <span className="who">
              <b>{project ? project.slug : 'All projects'}</b>
              <small>{project ? `${project.slug}.rwa-id.eth` : `${projects.length} namespace${projects.length === 1 ? '' : 's'}`}</small>
            </span>
            <span style={{ color: 'var(--faint)', fontSize: 11 }}>↕</span>
          </button>
          {switching && (
            <div className="switch-list">
              <button className="switch-item" onClick={() => go('projects', null)}><span className="initials">··</span>All projects</button>
              {projects.map(p => (
                <button key={p.id} className="switch-item" onClick={() => go('overview', p.id)}>
                  <span className="initials lime">{initials(p.slug)}</span>
                  <span>{p.slug}<small>#{p.id} · {p.active ? 'Active' : 'Paused'}</small></span>
                </button>
              ))}
              <button className="switch-item add" onClick={() => go('create', null)}><span className="initials">+</span>Register a namespace</button>
            </div>
          )}
        </div>

        <nav className="side-nav">
          {inProject ? NAV.map(g => (
            <section key={g.group}>
              <h6>{g.group}</h6>
              {g.items.map(([id, label, badge]) => (
                <button key={id} className={`nav-item${screen === id ? ' on' : ''}`} onClick={() => go(id)}>
                  <i />{label}{badge && <span className="new">NEW</span>}
                </button>
              ))}
              {g.group === 'Administration' && <button className="nav-item" onClick={() => setGuide(true)}><i />Setup guide</button>}
            </section>
          )) : (
            <section>
              <h6>Console</h6>
              <button className={`nav-item${screen === 'projects' ? ' on' : ''}`} onClick={() => go('projects', null)}><i />All projects</button>
              <button className={`nav-item${screen === 'create' ? ' on' : ''}`} onClick={() => go('create', null)}><i />Register a namespace</button>
              <button className="nav-item" onClick={() => setGuide(true)}><i />Setup guide</button>
            </section>
          )}
        </nav>

        <div className="side-foot">
          <div className="wallet">
            <span className="avatar" />
            <span className="who">
              <b>{shortAddress(address)}</b>
              {wrongChain
                ? <small className="wrong" role="button" style={{ cursor: 'pointer' }} onClick={() => switchChain({ chainId: ROBINHOOD_CHAIN_ID })}><i />Wrong network · switch</small>
                : <small><i />Robinhood Chain</small>}
            </span>
            <button className="icon-btn-dark" onClick={handleDisconnect} title="Disconnect" aria-label="Disconnect wallet">⏻</button>
          </div>
          <button className="cmd" onClick={() => setPalette(true)}>Search &amp; commands <span className="kbd">⌘K</span></button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <button className="btn btn-sm side-toggle" onClick={() => setSideOpen(true)} aria-label="Open navigation">☰</button>
          <div className="crumbs">
            <button onClick={() => go('projects', null)}>Projects</button>
            <span style={{ color: 'var(--placeholder)' }}>/</span>
            <b>{crumb}</b>
          </div>
          <div className="topbar-actions">
            <span className="read-chip"><i />read from Robinhood Chain</span>
            <button className="btn btn-sm" onClick={refresh} disabled={loading}>{loading ? 'Reading…' : '↻ Refresh'}</button>
            <a className="btn btn-sm hide-sm" href={explorerAddress(RWAID_ADDRESS)} target="_blank" rel="noreferrer">Explorer ↗</a>
          </div>
        </div>

        <div className="content">
          <div className="content-inner" key={`${screen}-${pid}-${freshness}`}>
            {wrongChain && (
              <div className="notice warn" style={{ marginBottom: 20 }}>
                <span className="n-icon">!</span>
                <span style={{ flex: 1 }}>Your wallet is on another network. RWA ID runs on Robinhood Chain; every action here will ask to switch first.</span>
                <button className="btn btn-sm btn-ink" onClick={() => switchChain({ chainId: ROBINHOOD_CHAIN_ID })}>Switch</button>
              </div>
            )}
            {logError && (
              <div className="notice warn" style={{ marginBottom: 20 }}>
                <span className="n-icon">!</span>
                <span>Contract events are unavailable, so allowlist counts and activity are missing. Storage-backed figures (claims, revenue, fees) are unaffected. {logError}</span>
              </div>
            )}
            {body}
          </div>
        </div>
      </div>

      {guide && <SetupGuide onClose={() => setGuide(false)} />}
      {palette && (
        <CommandPalette onClose={() => setPalette(false)} projects={projects} hasProject={inProject} go={go}
          onGuide={() => { setPalette(false); setGuide(true) }} />
      )}
      {(switching || sideOpen) && <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => { setSwitching(false); setSideOpen(false) }} />}
    </div>
  )
}

function ProjectHead({ project, screen, go }) {
  const overview = screen === 'overview'
  return (
    <div className="page-head">
      <div>
        <span className="kicker">{overview ? 'Project' : `${project.slug}.rwa-id.eth`}</span>
        <div className="title-row">
          <h1 className="display">{overview ? project.slug : TITLES[screen]}</h1>
          <span className={`pill ${project.active ? 'lime' : 'orange'}`}>{project.active ? 'Active' : 'Paused'}</span>
        </div>
        <span className="meta" style={{ fontSize: 12.5 }}>{project.slug}.rwa-id.eth · project #{project.id} · owner {shortAddress(project.owner)}</span>
      </div>
      {overview && (
        <div className="row">
          <button className="btn" onClick={() => go('registry')}>Look up an identity</button>
          <button className="btn btn-ink" onClick={() => go('allowlist')}>Update allowlist</button>
        </div>
      )}
    </div>
  )
}
