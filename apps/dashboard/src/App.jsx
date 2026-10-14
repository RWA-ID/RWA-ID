import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import Home from './components/Home'
import Console, { ConnectGate } from './components/Console'
import ClaimPage, { ClaimStart } from './components/ClaimPage'
import LegalPage from './components/LegalPage'
import DocsPage from './components/DocsPage'
import NamesPage from './components/NamesPage'
import { isConsoleHost } from './lib/nav'

const LEGAL_ROUTES = { '/privacy': 'privacy', '/terms': 'terms', '/refunds': 'refunds' }

const currentPath = () => window.location.pathname.replace(/\/+$/, '') || '/'

// dashboard.rwa-id.com opens straight into the console; rwa-id.com opens the
// site, with the console at /console. Both hosts serve this same build.

export default function App() {
  const { address, isConnected } = useAccount()
  const [path, setPath] = useState(currentPath)
  const [search, setSearch] = useState(window.location.search)

  useEffect(() => {
    const onPop = () => { setPath(currentPath()); setSearch(window.location.search) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const params = new URLSearchParams(search)
  if (params.get('claim') && params.get('proofs')) {
    return <ClaimPage projectId={params.get('claim')} cid={params.get('proofs')} version={params.get('v')} />
  }

  if (path === '/claim') return <ClaimStart />
  if (path === '/docs') return <DocsPage />
  if (path === '/names') return <NamesPage />
  if (LEGAL_ROUTES[path]) return <LegalPage doc={LEGAL_ROUTES[path]} />

  if (path === '/console' || (path === '/' && isConsoleHost())) {
    return isConnected ? <Console address={address} /> : <ConnectGate />
  }

  return <Home />
}
