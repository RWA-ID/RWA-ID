import { useCallback, useEffect, useState } from 'react'
import { useReadContract } from 'wagmi'
import { isAddress, parseUnits } from 'viem'
import { RWAID_ADDRESS, RWAID_ABI, USDG_ADDRESS, ERC20_ABI } from '../../lib/contracts'
import { ROBINHOOD_CHAIN_ID, explorerTx } from '../../lib/chain'
import { readClient } from '../../lib/readClient'
import { fetchProofSet } from '../../lib/allowlistStore'
import { useProofSet } from '../../lib/useProofSet'
import { errorText, num, shortAddress, treasuryPercent, usd } from '../../lib/format'
import TxDrawer, { useTx } from '../TxDrawer'

const amountOk = (s) => /^\d*(\.\d{0,6})?$/.test(s.trim()) && Number(s) > 0
const DELIVER_CAP = 500

export default function SponsorshipScreen({ project, projectId, refresh, address, protocolFeePercent }) {
  const pid = BigInt(projectId)
  const fee = project.effectiveFee
  const pool = project.sponsorBalance
  const yourPct = treasuryPercent(protocolFeePercent)
  const ownTreasury = project.treasury.toLowerCase() === address?.toLowerCase()

  const [fund, setFund] = useState('')
  const [withdraw, setWithdraw] = useState('')
  const [to, setTo] = useState(address || '')
  const [drawer, setDrawer] = useState(null) // 'fund' | 'withdraw'
  const approveTx = useTx()
  const fundTx = useTx()
  const withdrawTx = useTx()

  const erc = (functionName, args) => ({ address: USDG_ADDRESS, abi: ERC20_ABI, functionName, args, chainId: ROBINHOOD_CHAIN_ID, query: { enabled: !!address } })
  const { data: allowance, refetch: refetchAllowance } = useReadContract(erc('allowance', [address, RWAID_ADDRESS]))
  const { data: balance, refetch: refetchBalance } = useReadContract(erc('balanceOf', [address]))
  useEffect(() => { if (approveTx.stage === 'done') refetchAllowance() }, [approveTx.stage, refetchAllowance])
  const refetchWallet = useCallback(() => { refetchAllowance(); refetchBalance() }, [refetchAllowance, refetchBalance])

  const fundAmount = amountOk(fund) ? parseUnits(fund.trim(), 6) : 0n
  const wAmount = amountOk(withdraw) ? parseUnits(withdraw.trim(), 6) : 0n
  const needsApproval = fundAmount > 0n && (allowance ?? 0n) < fundAmount
  const short = fundAmount > 0n && balance !== undefined && balance < fundAmount

  return (
    <div className="stack">
      <div className="grid grid-2">
        <div className="card ink card-pad">
          <span className="label" style={{ color: 'var(--steel)' }}>Sponsor pool</span>
          <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>{usd(pool)} <span style={{ fontSize: 18, color: 'var(--steel)' }}>USDG</span></span>
          <span className="note" style={{ color: 'var(--steel)' }}>
            Covers {num(fee > 0n ? pool / fee : 0n)} claims at {usd(fee)}. While the pool holds at least one fee, clients claim free and
            the pool pays: {yourPct}% goes straight back to your treasury, {100 - yourPct}% to the protocol.
          </span>
          <div className="kv">
            <div className="kv-row"><span>Your real cost per name</span><span style={{ color: 'var(--lime)' }}>{ownTreasury ? usd(fee * BigInt(100 - yourPct) / 100n) : usd(fee)}</span></div>
            <div className="kv-row"><span>Treasury</span><span>{ownTreasury ? 'this wallet' : shortAddress(project.treasury)}</span></div>
          </div>
        </div>

        <div className="card card-pad">
          <span className="card-title">Fund the pool</span>
          <div className="input-affix">
            <input value={fund} onChange={(e) => setFund(e.target.value)} inputMode="decimal" placeholder="50.00" aria-label="Amount to fund in USDG" />
            <span className="affix">USDG</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {[10, 50, 100].map(n => <button key={n} className="btn btn-sm" onClick={() => setFund((Number(fee) * n / 1e6).toFixed(2))}>{n} claims</button>)}
          </div>
          <span className="note">Wallet balance: {balance !== undefined ? `${usd(balance)} USDG` : '—'}. Anyone can fund a pool; only you can withdraw from it.</span>
          {short && <span className="hint bad">This wallet holds less than that.</span>}
          {needsApproval ? (
            <button className="btn btn-ink" disabled={short || ['signing', 'pending'].includes(approveTx.stage)}
              onClick={() => approveTx.writeContract({ address: USDG_ADDRESS, abi: ERC20_ABI, functionName: 'approve', args: [RWAID_ADDRESS, fundAmount] })}>
              {approveTx.stage === 'signing' ? 'Confirm in wallet…' : approveTx.stage === 'pending' ? 'Approving…' : `1 · Approve ${usd(fundAmount)} USDG`}
            </button>
          ) : (
            <button className="btn btn-lime" disabled={!fundAmount || short} onClick={() => setDrawer('fund')}>Fund {fundAmount ? usd(fundAmount) : ''} →</button>
          )}
          {approveTx.error && <span className="hint bad">{errorText(approveTx.error)}</span>}
        </div>
      </div>

      <DeliverNames project={project} projectId={projectId} pid={pid} fee={fee} pool={pool} refresh={refresh}
        allowance={allowance} balance={balance} onFunded={refetchWallet} />

      <div className="card card-pad" style={{ maxWidth: 720 }}>
        <span className="card-title">Withdraw from the pool</span>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
          <div className="input-affix">
            <input value={withdraw} onChange={(e) => setWithdraw(e.target.value)} inputMode="decimal" placeholder="0.00" aria-label="Amount to withdraw" />
            <button className="btn btn-sm" onClick={() => setWithdraw((Number(pool) / 1e6).toFixed(6).replace(/\.?0+$/, ''))}>Max</button>
          </div>
          <input className={`input${to && !isAddress(to.trim()) ? ' bad' : ''}`} value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x… send to" spellCheck="false" />
        </div>
        <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={!wAmount || wAmount > pool || !isAddress(to.trim())} onClick={() => setDrawer('withdraw')}>Withdraw</button>
      </div>

      <TxDrawer
        open={drawer === 'fund'}
        onClose={() => { setDrawer(null); fundTx.reset() }}
        tx={fundTx}
        title="Fund sponsor pool"
        summary={`Moves ${usd(fundAmount)} USDG from this wallet into ${project.slug}’s sponsor pool.`}
        rows={[{ k: 'Pool', v: `${usd(pool)} → ${usd(pool + fundAmount)}` }, { k: 'Covers', v: `${num(fee > 0n ? (pool + fundAmount) / fee : 0n)} claims` }]}
        fn="fundSponsorship(uint256,uint256)"
        onSign={() => fundTx.writeContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'fundSponsorship', args: [pid, fundAmount] })}
        onDone={() => { setFund(''); refetchBalance(); refresh() }}
      />
      <TxDrawer
        open={drawer === 'withdraw'}
        onClose={() => { setDrawer(null); withdrawTx.reset() }}
        tx={withdrawTx}
        title="Withdraw from sponsor pool"
        summary={`Sends ${usd(wAmount)} USDG from the pool to ${shortAddress(to.trim())}.`}
        rows={[{ k: 'Pool', v: `${usd(pool)} → ${usd(pool - wAmount)}` }, { k: 'To', v: shortAddress(to.trim()) }]}
        fn="withdrawSponsorship(uint256,uint256,address)"
        onSign={() => withdrawTx.writeContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'withdrawSponsorship', args: [pid, wAmount, to.trim()] })}
        onDone={() => { setWithdraw(''); refresh() }}
      />
    </div>
  )
}

/**
 * claimFor: the platform sends a name straight to an allowlisted wallet, so the
 * client never has to visit a page or hold gas. The allowlist still binds each
 * name to its wallet; the contract will only mint a name to the wallet it was
 * allowlisted for.
 */
function DeliverNames({ project, projectId, pid, fee, pool, refresh, allowance, balance, onFunded }) {
  const { proofSet, state } = useProofSet(project, projectId)
  const [entries, setEntries] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [busyRow, setBusyRow] = useState(null)
  const [done, setDone] = useState({})
  const tx = useTx()
  const approveTx = useTx()

  // While the pool holds a full fee it pays. Below that, claimFor charges the
  // sending wallet, so it needs USDG and an approval before any delivery.
  const poolPays = pool >= fee
  const walletReady = (allowance ?? 0n) >= fee && (balance ?? 0n) >= fee
  const canDeliver = poolPays || walletReady
  useEffect(() => { if (approveTx.stage === 'done') onFunded() }, [approveTx.stage, onFunded])

  useEffect(() => {
    if (!proofSet?.cid) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchProofSet(proofSet.cid)
        const list = (data.entries || []).slice(0, DELIVER_CAP)
        const claimed = await readClient.multicall({
          contracts: list.map(e => ({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'claimed', args: [pid, e.wallet || e.address] })),
          allowFailure: false,
        })
        if (!cancelled) setEntries(list.map((e, i) => ({ ...e, wallet: e.wallet || e.address, claimed: claimed[i] })))
      } catch (err) {
        if (!cancelled) setLoadError(err.shortMessage || err.message || 'Could not load the allowlist.')
      }
    })()
    return () => { cancelled = true }
  }, [proofSet?.cid, pid])

  useEffect(() => {
    if (tx.stage === 'done' && busyRow) {
      setDone(d => ({ ...d, [busyRow]: tx.hash }))
      setBusyRow(null)
      onFunded()
      // Re-read the project (pool balance, claim count) once the confirmation has been seen.
      setTimeout(refresh, 3000)
    }
    if (tx.stage === 'reverted' && busyRow) setBusyRow(null)
  }, [tx.stage, tx.hash, busyRow, refresh, onFunded])

  const pending = (entries || []).filter(e => !e.claimed && !done[e.wallet])
  const deliver = (e) => {
    tx.reset()
    setBusyRow(e.wallet)
    tx.writeContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'claimFor', args: [pid, e.wallet, e.name, e.proof] })
  }

  return (
    <div className="card">
      <div className="card-head">Deliver names<span className="meta">{entries ? `${num(pending.length)} not yet claimed` : ''}</span></div>
      <div className="card-body">
        <span className="note">
          Mint a name straight to a client’s wallet. They don’t need to visit the claim page or hold gas; you pay the
          network fee (a fraction of a cent) and {poolPays
            ? 'the sponsor pool pays the claim fee.'
            : `this wallet pays the ${usd(fee)} USDG claim fee, because the pool holds less than one fee. Fund the pool above, or approve USDG from this wallet.`}
        </span>
        {!poolPays && !walletReady && (
          (balance ?? 0n) < fee
            ? <span className="hint bad">This wallet holds {usd(balance ?? 0n)} USDG, less than one fee. Fund the pool to deliver.</span>
            : <button className="btn btn-ink" style={{ alignSelf: 'flex-start' }} disabled={['signing', 'pending'].includes(approveTx.stage)}
                onClick={() => approveTx.writeContract({ address: USDG_ADDRESS, abi: ERC20_ABI, functionName: 'approve', args: [RWAID_ADDRESS, fee * BigInt(Math.max(pending.length, 1))] })}>
                {approveTx.stage === 'signing' ? 'Confirm in wallet…' : approveTx.stage === 'pending' ? 'Approving…' : `Approve ${usd(fee * BigInt(Math.max(pending.length, 1)))} USDG for deliveries`}
              </button>
        )}
        {state === 'loading' || (proofSet?.cid && !entries && !loadError) ? (
          <div className="row"><span className="spinner" /><span className="meta">Loading the allowlist and checking claims…</span></div>
        ) : loadError ? (
          <div className="notice warn"><span className="n-icon">!</span><span>{loadError}</span></div>
        ) : !proofSet?.cid ? (
          <span className="note">Publish an allowlist first.</span>
        ) : pending.length === 0 ? (
          <span className="note">Every allowlisted wallet{entries.length === DELIVER_CAP ? ' in the first 500' : ''} has its name.</span>
        ) : (
          <div className="tbl">
            <div className="tbl-head" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr) 120px' }}><span>Name</span><span>Wallet</span><span /></div>
            <div className="tbl-scroll">
              {pending.map(e => (
                <div key={e.wallet} className="tbl-row" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr) 120px' }}>
                  <b>{e.name}.{project.slug}</b>
                  <span style={{ color: 'var(--muted)' }}>{shortAddress(e.wallet, 8, 6)}</span>
                  <button className="btn btn-sm btn-lime" disabled={!!busyRow || !project.active || !canDeliver} onClick={() => deliver(e)}>
                    {busyRow === e.wallet ? (tx.stage === 'pending' ? 'Minting…' : 'Confirm…') : 'Deliver →'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {Object.entries(done).map(([w, h]) => (
          <span key={w} className="hint good">✓ Delivered to {shortAddress(w)} · <a href={explorerTx(h)} target="_blank" rel="noreferrer">tx ↗</a></span>
        ))}
        {!project.active && <span className="hint bad">Claiming is paused for this project, so names cannot be delivered.</span>}
        {tx.error && <span className="hint bad">{errorText(tx.error)}</span>}
        {tx.stage === 'reverted' && <span className="hint bad">That delivery was rejected on-chain. Check the pool or this wallet’s USDG approval.</span>}
      </div>
    </div>
  )
}
