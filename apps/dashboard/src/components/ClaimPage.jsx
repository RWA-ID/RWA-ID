import { useEffect, useMemo, useState } from 'react'
import { useAccount, useDisconnect, useReadContract } from 'wagmi'
import { decodeEventLog } from 'viem'
import { modal } from '../lib/wagmi'
import { RWAID_ADDRESS, RWAID_ABI, USDG_ADDRESS, ERC20_ABI, IDENTITY_CLAIMED } from '../lib/contracts'
import { ROBINHOOD_CHAIN_ID, explorerTx, explorerToken } from '../lib/chain'
import { parseProject } from '../lib/useProjects'
import { fetchProofSet, REGISTRY_VERSION } from '../lib/allowlistStore'
import { errorText, shortAddress, usd } from '../lib/format'
import { linkTo, navigate, siteHome } from '../lib/nav'
import { useTx } from './TxDrawer'
import { Lockup, RwaMark } from './Brand'

const read = (functionName, args, enabled = true) => ({
  address: RWAID_ADDRESS, abi: RWAID_ABI, functionName, args, chainId: ROBINHOOD_CHAIN_ID, query: { enabled },
})

function Shell({ slug, address, onDisconnect, children }) {
  return (
    <div className="claim">
      <header className="claim-head">
        <Lockup href={siteHome()} onClick={linkTo} size={26} word={16} />
        {slug && <span className="ns">{slug}.rwa-id.eth</span>}
        {address && <button className="btn" onClick={onDisconnect}>{shortAddress(address)} · Disconnect</button>}
      </header>
      <main className="claim-main">{children}</main>
      <footer className="claim-foot">
        <span>Names resolve through ENS. Registry on Robinhood Chain.</span>
        <a href="/privacy" onClick={linkTo}>Privacy</a>
        <a href="/terms" onClick={linkTo}>Terms</a>
      </footer>
    </div>
  )
}

function Notice({ icon, tone, title, children, action }) {
  return (
    <div className="claim-notice">
      <span className={`sq ${tone || ''}`}>{icon}</span>
      <h1 className="display">{title}</h1>
      <div className="lede" style={{ fontSize: 16 }}>{children}</div>
      {action}
    </div>
  )
}

function IdCard({ label, slug, chip, chipTone = 'orange', meta, image, won }) {
  return (
    <div className={`id-card${won ? ' won' : ''}`}>
      <span className="ring1" aria-hidden="true" /><span className="ring2" aria-hidden="true" />
      <div className="top">
        <RwaMark size={36} tone="dark" />
        <span className={`pill ${chipTone}`} style={{ color: 'var(--ink)' }}>{chip}</span>
      </div>
      {image && <img className="art" src={image} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />}
      <div className="name">
        <strong>{label}<span>.{slug}.rwa-id.eth</span></strong>
        <small>{meta}</small>
      </div>
      <span className="bar8" aria-hidden="true" />
    </div>
  )
}

function Utility({ slug, transferable }) {
  return (
    <div className="utility">
      <div><i style={{ background: 'var(--lime)' }} /><span><b>One name, every wallet</b><p>People send to the name instead of a 42-character address. Works in MetaMask, Rainbow, Trust and anything that reads ENS.</p></span></div>
      <div><i style={{ background: 'var(--orange)' }} /><span><b>Issued by {slug}</b><p>{slug} allowlisted your wallet, and that record sits on-chain where anyone can check it.</p></span></div>
      <div><i style={{ background: 'var(--ink)' }} /><span><b>Held in your wallet</b><p>Minted to you, not stored on a platform server. {transferable ? 'This one is transferable: you can move it later.' : 'This one is soulbound: it stays with this wallet.'}</p></span></div>
    </div>
  )
}

/** ipfs:// and ar:// artwork rendered through a public gateway. */
function artUrl(uri) {
  if (!uri) return null
  if (uri.startsWith('ipfs://')) return `https://ipfs.onchain-id.id/ipfs/${uri.slice(7)}`
  if (uri.startsWith('ar://')) return `https://arweave.net/${uri.slice(5)}`
  return uri
}

/** /claim with no link: explain where claiming starts, and accept a pasted link. */
export function ClaimStart() {
  const [value, setValue] = useState('')
  const [bad, setBad] = useState(false)
  useEffect(() => { document.title = 'Claim your name · RWA ID' }, [])
  const open = (e) => {
    e.preventDefault()
    try {
      const u = new URL(value.trim(), window.location.origin)
      if (!u.searchParams.get('claim') || !u.searchParams.get('proofs')) throw new Error()
      navigate(`/claim/?${u.searchParams.toString()}`)
    } catch { setBad(true) }
  }
  return (
    <Shell>
      <div className="claim-grid center">
        <div className="claim-pitch">
          <span className="kicker">Claim</span>
          <h1 className="claim-h1">Your wallet,<br /><mark>with a name on it.</mark></h1>
          <p className="lede" style={{ maxWidth: 520 }}>
            Claiming starts from the link your platform sent you. It names the platform and carries the proof that your
            wallet is on their list. Open it, or paste it here.
          </p>
          <form onSubmit={open} className="field" style={{ maxWidth: 560 }}>
            <div className="input-affix">
              <input value={value} onChange={(e) => { setValue(e.target.value); setBad(false) }} placeholder="https://rwa-id.com/claim?claim=…&proofs=…" aria-label="Claim link" />
              <button className="btn btn-ink btn-sm" type="submit" disabled={!value.trim()}>Open</button>
            </div>
            {bad && <span className="hint bad">That is not a claim link. It should contain ?claim= and &proofs=.</span>}
          </form>
        </div>
        <IdCard label="you" slug="yourplatform" chip="Reserved" meta="Issued by your platform · Robinhood Chain" />
      </div>
    </Shell>
  )
}

export default function ClaimPage({ projectId, cid, version }) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const pid = useMemo(() => { try { return BigInt(projectId) } catch { return null } }, [projectId])

  const [proofs, setProofs] = useState(null)
  const [ipfsError, setIpfsError] = useState('')
  const [slow, setSlow] = useState(false)

  const legacy = version !== REGISTRY_VERSION

  useEffect(() => {
    if (legacy || pid == null) return
    let cancelled = false
    fetchProofSet(cid)
      .then(d => { if (!cancelled) setProofs(d) })
      .catch(err => { if (!cancelled) setIpfsError(err.message || 'Could not load the allowlist for this link.') })
    return () => { cancelled = true }
  }, [cid, legacy, pid])

  const ok = !legacy && pid != null
  const { data: projectRaw, error: projectError } = useReadContract(read('projects', [pid], ok))
  const project = parseProject(projectRaw)
  const { data: fee } = useReadContract(read('effectiveClaimFee', [pid], ok))
  const { data: pool, refetch: refetchPool } = useReadContract(read('sponsorBalance', [pid], ok))
  const { data: image } = useReadContract(read('projectImage', [pid], ok))
  const { data: hasClaimed, refetch: refetchClaimed } = useReadContract(read('claimed', [pid, address], ok && !!address))
  const erc = (functionName, args) => ({ address: USDG_ADDRESS, abi: ERC20_ABI, functionName, args, chainId: ROBINHOOD_CHAIN_ID, query: { enabled: !!address } })
  const { data: allowance, refetch: refetchAllowance } = useReadContract(erc('allowance', [address, RWAID_ADDRESS]))
  const { data: balance } = useReadContract(erc('balanceOf', [address]))

  const approveTx = useTx()
  const claimTx = useTx()

  useEffect(() => { if (approveTx.stage === 'done') refetchAllowance() }, [approveTx.stage, refetchAllowance])
  useEffect(() => { if (claimTx.stage === 'done') { refetchClaimed(); refetchPool() } }, [claimTx.stage, refetchClaimed, refetchPool])
  useEffect(() => {
    if (claimTx.stage !== 'pending') { setSlow(false); return }
    const t = setTimeout(() => setSlow(true), 45_000)
    return () => clearTimeout(t)
  }, [claimTx.stage])

  const slug = project?.slug
  useEffect(() => { if (slug) document.title = `Claim your ${slug}.rwa-id.eth name · RWA ID` }, [slug])

  const disconnectAll = async () => {
    try { await modal.disconnect() } catch { /* already closed */ }
    try { disconnect() } catch { /* already gone */ }
  }
  const shell = (children) => <Shell slug={slug} address={isConnected ? address : null} onDisconnect={disconnectAll}>{children}</Shell>

  if (legacy) {
    return shell(
      <Notice icon="!" tone="orange" title="This link is for the old registry">
        RWA ID moved to Robinhood Chain in October 2026, and this claim link was issued for the previous registry on
        Ethereum mainnet. Ask the platform that sent it for a new link.
      </Notice>,
    )
  }
  if (pid == null) {
    return shell(<Notice icon="!" tone="orange" title="This link is not working">The project number in this link is not valid.</Notice>)
  }
  if (ipfsError || projectError) {
    return shell(
      <Notice icon="!" tone="orange" title="This link is not working">
        {ipfsError || 'The registry could not be read right now. Reload in a moment.'} {slug ? `Ask ${slug} for a fresh link if it keeps failing.` : ''}
      </Notice>,
    )
  }
  if (!proofs || !project || fee === undefined || pool === undefined) {
    return shell(<Notice icon={<span className="spinner lg" />} title="Checking your eligibility">Reading the allowlist from IPFS and the registry from Robinhood Chain.</Notice>)
  }
  // The proof set must be the one the project is enforcing. A stale or foreign
  // link would otherwise walk the client into a claim that can only revert.
  if (proofs.merkleRoot?.toLowerCase() !== project.merkleRoot?.toLowerCase()) {
    return shell(
      <Notice icon="!" tone="orange" title="This link is out of date">
        {slug} has published a newer allowlist since this link was made. Ask them for the current claim link.
      </Notice>,
    )
  }

  const entry = isConnected && proofs.entries?.find(e => (e.wallet || e.address)?.toLowerCase() === address?.toLowerCase())
  const sponsored = pool >= fee
  const art = artUrl(image)
  const name = entry?.name

  /* ── Claimed ── */
  if (hasClaimed || claimTx.stage === 'done') {
    let tokenId = null
    for (const log of claimTx.receipt?.logs ?? []) {
      try {
        const ev = decodeEventLog({ abi: [IDENTITY_CLAIMED], data: log.data, topics: log.topics })
        tokenId = ev.args.tokenId.toString()
      } catch { /* not ours */ }
    }
    const full = name ? `${name}.${slug}.rwa-id.eth` : `${slug}.rwa-id.eth`
    return shell(
      <div className="claim-grid center">
        <IdCard won label={name || 'your name'} slug={slug} chip="Claimed" chipTone="lime" image={art}
          meta={`${tokenId ? `token #${tokenId} · ` : ''}held by ${shortAddress(address)}`} />
        <div className="claim-pitch" style={{ gap: 20 }}>
          <span className="pill lime ring" style={{ alignSelf: 'flex-start' }}>✓ It’s yours</span>
          {/* Sized to fit the column on one line (~0.52em per condensed caps glyph); wraps only below the 28px floor. */}
          <h1 className="claim-h1" style={{ fontSize: `max(28px, min(68px, calc(100cqi / ${(full.length * 0.52).toFixed(2)})))`, overflowWrap: 'anywhere' }}>
            {full}
          </h1>
          <p className="lede" style={{ fontSize: 17 }}>
            It’s live and held by {shortAddress(address)}. Try it in any ENS-aware wallet: type the name where you’d
            normally paste your address.
          </p>
          <div className="row">
            {name && <a className="btn btn-lime" href="/names" onClick={linkTo}>Add Bitcoin, Solana & more →</a>}
            {name && <a className="btn btn-ink" href={`https://app.ens.domains/${full}`} target="_blank" rel="noreferrer">View in ENS ↗</a>}
            {tokenId && <a className="btn" href={explorerToken(RWAID_ADDRESS, tokenId)} target="_blank" rel="noreferrer">Token ↗</a>}
            {claimTx.hash && <a className="btn" href={explorerTx(claimTx.hash)} target="_blank" rel="noreferrer">Transaction ↗</a>}
          </div>
        </div>
      </div>,
    )
  }

  /* ── Not connected ── */
  if (!isConnected) {
    return shell(
      <div className="claim-grid">
        <div className="claim-pitch">
          <span className="kicker">Issued by {slug}</span>
          <h1 className="claim-h1">Your wallet,<br /><mark>with a name on it.</mark></h1>
          <p className="lede" style={{ maxWidth: 520 }}>
            {slug} has reserved a name for you under {slug}.rwa-id.eth. Connect the wallet they allowlisted to see which name is yours.
          </p>
          <button className="btn btn-ink btn-lg" style={{ alignSelf: 'flex-start', color: 'var(--lime)' }} onClick={() => modal.open()}>Connect wallet →</button>
          <Utility slug={slug} transferable={project.transferable} />
        </div>
        <aside className="stack">
          <IdCard label="you" slug={slug} chip="Reserved" image={art}
            meta={`${project.transferable ? 'Transferable' : 'Soulbound'} · ${art ? `${slug} artwork` : 'artwork stored on-chain'} · Robinhood Chain`} />
          <p className="note" style={{ padding: '0 8px' }}>
            {sponsored
              ? `${slug} covers the claim fee, so claiming is free: one wallet confirmation and a little ETH on Robinhood Chain for gas.`
              : `Claiming costs ${usd(fee)} USDG and takes two wallet confirmations: approve, then claim. Every identity mints straight to your wallet.`}
          </p>
        </aside>
      </div>,
    )
  }

  /* ── Not allowlisted ── */
  if (!entry) {
    return shell(
      <Notice icon="✕" title="Not on the allowlist" action={<button className="btn" onClick={disconnectAll}>Try another wallet</button>}>
        {shortAddress(address)} is not in {slug}’s proof set. If you have more than one wallet, try the one you gave them, or ask {slug} to add you.
      </Notice>,
    )
  }

  const full = `${name}.${slug}.rwa-id.eth`

  /* ── Paused ── */
  if (!project.active) {
    return shell(
      <Notice icon="II" tone="orange" title="Claiming is paused">
        {slug} has paused new claims. {full} is still reserved for this wallet, and you can claim it when they reopen.
      </Notice>,
    )
  }

  const approved = sponsored || (allowance !== undefined && allowance >= fee)
  const funded = sponsored || (balance !== undefined && balance >= fee)
  const busy = ['signing', 'pending'].includes(approveTx.stage) || ['signing', 'pending'].includes(claimTx.stage)
  const error = approveTx.error || claimTx.error

  const doApprove = () => approveTx.writeContract({ address: USDG_ADDRESS, abi: ERC20_ABI, functionName: 'approve', args: [RWAID_ADDRESS, fee] })
  const doClaim = () => { if (claimTx.stage === 'reverted') claimTx.reset(); claimTx.writeContract({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'claim', args: [pid, name, entry.proof] }) }

  const label = !approved
    ? approveTx.stage === 'signing' ? 'Confirm in your wallet…' : approveTx.stage === 'pending' ? 'Approving…' : `Approve ${usd(fee)} USDG`
    : claimTx.stage === 'signing' ? 'Confirm in your wallet…' : claimTx.stage === 'pending' ? 'Minting your identity…' : 'Claim this name →'

  return shell(
    <div className="claim-grid">
      <div className="claim-pitch">
        <span className="kicker">Issued by {slug}</span>
        <h1 className="claim-h1">Your wallet,<br /><mark>with a name on it.</mark></h1>
        <div className="transform-card">
          <div className="from"><span className="label">Your wallet today</span><span>{address}</span></div>
          <span className="down" aria-hidden="true">↓</span>
          <div className="to"><span className="label" style={{ color: 'var(--steel)' }}>After you claim</span><strong>{name}<span>.{slug}.rwa-id.eth</span></strong></div>
        </div>
        <Utility slug={slug} transferable={project.transferable} />
      </div>

      <aside className="stack">
        <IdCard label={name} slug={slug} chip="Ready to claim" chipTone="lime" image={art}
          meta={`${project.transferable ? 'Transferable' : 'Soulbound'} · ${art ? `${slug} artwork` : 'artwork stored on-chain'} · Robinhood Chain`} />
        <div className="claim-box">
          <div className="kv well">
            <div className="kv-row"><span>One-time fee</span><span>{sponsored ? `Free · sponsored by ${slug}` : `${usd(fee)} USDG`}</span></div>
            <div className="kv-row"><span>Network</span><span>Robinhood Chain</span></div>
            {!sponsored && <div className="kv-row"><span>Your balance</span><span>{balance !== undefined ? `${usd(balance)} USDG` : '—'}</span></div>}
          </div>

          <div className={`notice ${sponsored ? 'good' : ''}`} style={sponsored ? undefined : { background: 'var(--paper)' }}>
            <span className="n-icon" style={sponsored ? undefined : { background: '#fff' }}>{sponsored ? '1' : '2'}</span>
            <span>
              {sponsored
                ? <><b>One wallet confirmation.</b> {slug} covers the fee; you only pay a fraction of a cent in ETH for gas.</>
                : <><b>Two wallet confirmations.</b> First approve {usd(fee)} USDG so the registry can take the fee, then claim. You’ll need a little ETH on Robinhood Chain for gas.</>}
            </span>
          </div>

          {!funded ? (
            <div className="notice warn">
              <span className="n-icon">!</span>
              <span>Claiming costs {usd(fee)} USDG on Robinhood Chain and this wallet holds {balance !== undefined ? usd(balance) : '—'}. Add USDG (bridged USDC arrives as USDG), then reload.</span>
            </div>
          ) : (
            <>
              {!sponsored && (
                <div className="steps2">
                  <span className={approved ? 'done' : 'cur'}><i>{approved ? '✓' : '1'}</i>{approved ? 'USDG approved' : `Approve ${usd(fee)} USDG`}</span>
                  <span className={approved ? 'cur' : ''}><i>2</i>Claim your name</span>
                </div>
              )}
              <button className="btn btn-lime btn-lg btn-full" disabled={busy} onClick={approved ? doClaim : doApprove}>{label}</button>
            </>
          )}

          {slow && <div className="notice warn"><span className="n-icon">!</span><span>This is taking longer than usual. Check your wallet’s activity list, and reload this page to start again if nothing is pending there.</span></div>}
          {claimTx.stage === 'reverted' && <div className="notice danger"><span className="n-icon">!</span><span>The claim was rejected on-chain and no name was minted. No fee was taken.</span></div>}
          {error && <div className="notice danger"><span className="n-icon">!</span><span>{errorText(error)}</span></div>}
        </div>
      </aside>
    </div>,
  )
}
