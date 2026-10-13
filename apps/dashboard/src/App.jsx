import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { modal } from './lib/wagmi'
import Landing from './components/Landing'
import Console from './components/Console'
import ClaimPage from './components/ClaimPage'
import LegalPage from './components/LegalPage'
import DocsPage from './components/DocsPage'

const LEGAL_ROUTES = { '/privacy': 'privacy', '/terms': 'terms', '/refunds': 'refunds' }

function currentPath() {
  return window.location.pathname.replace(/\/+$/, '') || '/'
}

export default function App() {
  const { address, isConnected } = useAccount()
  const [path, setPath] = useState(currentPath)

  // Legal pages are real URLs, so keep the SPA in step with back/forward.
  useEffect(() => {
    const onPop = () => setPath(currentPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const params = new URLSearchParams(window.location.search)
  const claimProject = params.get('claim')
  const claimCid     = params.get('proofs')

  if (claimProject && claimCid) {
    return <ClaimPage projectId={claimProject} cid={claimCid} />
  }

  const goHome = () => {
    window.history.pushState({}, '', '/')
    setPath('/')
    window.scrollTo(0, 0)
  }

  // Docs are readable signed in or out, so they are matched before the wallet check.
  if (path === '/docs') {
    return <DocsPage onHome={goHome} onConnect={() => modal.open()} />
  }

  const legal = LEGAL_ROUTES[path]
  if (legal) {
    return (
      <LegalPage doc={legal} onHome={goHome} />
    )
  }

  if (!isConnected) {
    return <Landing onConnect={() => modal.open()} />
  }

  return <Console address={address} />
}
