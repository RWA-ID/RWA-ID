import { useState } from 'react'
import { RWAID_ADDRESS, RWAID_ABI } from '../../lib/contracts'
import { useLookup } from '../../lib/useLookup'
import { shortAddress } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'

export default function TransferabilityScreen({ project, projectId, refresh }) {
  const [choice, setChoice] = useState(project.transferable)
  const [query, setQuery] = useState('')
  const [drawer, setDrawer] = useState(null) // 'project' | 'token'
  const { result, loading, error, lookup, reset } = useLookup(projectId)
  const projectTx = useTx()
  const tokenTx = useTx()

  const live = result?.isClaimed && !result.isRevoked && result.tokenId !== '0'
  const tokenNext = live ? !result.transferable : null

  return (
    <div className="grid grid-2">
      <div className="card card-pad">
        <span className="card-title">Project default</span>
        <span className="note">Applies to every newly claimed name. Names already minted keep their own setting.</span>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button className={`choice${!choice ? ' on' : ''}`} style={{ alignItems: 'center' }} onClick={() => setChoice(false)}><b style={{ fontSize: 16 }}>Soulbound</b></button>
          <button className={`choice${choice ? ' on' : ''}`} style={{ alignItems: 'center' }} onClick={() => setChoice(true)}><b style={{ fontSize: 16 }}>Transferable</b></button>
        </div>
        <button className="btn btn-ink" style={{ alignSelf: 'flex-start' }} disabled={choice === project.transferable} onClick={() => setDrawer('project')}>Save default</button>
      </div>

      <div className="card card-pad">
        <span className="card-title">Per-token override</span>
        <form className="input-affix" onSubmit={(e) => { e.preventDefault(); lookup(query) }}>
          <input value={query} onChange={(e) => { setQuery(e.target.value); reset() }} placeholder="joe" aria-label="Name to look up" spellCheck="false" />
          <span className="affix">.{project.slug}.rwa-id.eth</span>
          <button className="btn btn-sm btn-ink" type="submit" disabled={!query.trim() || loading}>{loading ? '…' : 'Find'}</button>
        </form>
        {error && <span className="hint bad">{error}</span>}
        {result && (
          live ? (
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', padding: 14, borderRadius: 14, background: 'var(--paper)' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <b style={{ fontSize: 14, overflowWrap: 'anywhere' }}>{result.name}.{project.slug}.rwa-id.eth</b>
                <span className="meta">token #{result.tokenId} · {result.transferable ? 'transferable' : 'soulbound'} · held by {shortAddress(result.holder)}</span>
              </span>
              <button className={`toggle${result.transferable ? ' on' : ''}`} aria-label="Toggle transferability" onClick={() => setDrawer('token')}><i /></button>
            </div>
          ) : (
            <span className="note">{result.isRevoked ? 'That name was revoked.' : 'No one has claimed that name yet.'}</span>
          )
        )}
      </div>

      <TxDrawer
        open={drawer === 'project'}
        onClose={() => { setDrawer(null); projectTx.reset() }}
        tx={projectTx}
        title="Change project default"
        summary={`New names under ${project.slug} will be ${choice ? 'transferable' : 'soulbound'}.`}
        rows={[{ k: 'Default', v: `${project.transferable ? 'Transferable' : 'Soulbound'} → ${choice ? 'Transferable' : 'Soulbound'}` }]}
        fn="setProjectTransferable(uint256,bool)"
        onSign={() => projectTx.writeContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'setProjectTransferable', args: [BigInt(projectId), choice] })}
        onDone={refresh}
      />
      <TxDrawer
        open={drawer === 'token'}
        onClose={() => { setDrawer(null); tokenTx.reset() }}
        tx={tokenTx}
        title="Override one token"
        summary={`${result?.name}.${project.slug}.rwa-id.eth becomes ${tokenNext ? 'transferable' : 'soulbound'}.`}
        rows={[{ k: 'Token', v: `#${result?.tokenId}` }, { k: 'Setting', v: `${result?.transferable ? 'Transferable' : 'Soulbound'} → ${tokenNext ? 'Transferable' : 'Soulbound'}` }]}
        fn="setTokenTransferable(uint256,bool)"
        onSign={() => tokenTx.writeContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'setTokenTransferable', args: [BigInt(result.tokenId), tokenNext] })}
        onDone={() => lookup(result.name)}
      />
    </div>
  )
}
