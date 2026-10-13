import { useEffect, useState } from 'react'
import { useAccount, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { modal } from '../lib/wagmi'
import { RWAID_ADDRESS, RWAID_ABI, USDC_ADDRESS, USDC_ABI } from '../lib/contracts'
import { parseProject } from '../lib/useProjects'
import { fetchProofSet } from '../lib/allowlistStore'
import { effectiveFee, errorText, shortAddress, usd } from '../lib/format'
import IdentityCard from './IdentityCard'
import { ArrowRight, Check, Close, External, Pause, Warning } from './icons'

/* ── Shell ─────────────────────────────────────────────────────────────── */

function Shell({ slug, children, onDisconnect, address }) {
  return (
    <div className="claim-page">
      <header className="claim-bar">
        <span className="brand-mark" style={{ width: 20, height: 20, borderRadius: 5, fontSize: 10 }}>R</span>
        <span style={{ font: '500 13px/1 var(--f-sans)' }}>RWA·ID</span>
        {slug && <span className="claim-bar-ns">{slug}.rwa-id.eth</span>}
        {address && (
          <button className="claim-bar-btn" onClick={onDisconnect}>
            {shortAddress(address)} · Disconnect
          </button>
        )}
      </header>
      <main className="claim-body">{children}</main>
      <footer className="claim-foot">
        <span>Names resolve through ENS on Ethereum mainnet.</span>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </footer>
    </div>
  )
}

/** Centred single-message state — loading, errors, dead ends. */
function Notice({ tone = 'neutral', icon, title, children }) {
  return (
    <div className="claim-notice">
      <span className={`claim-mark ${tone}`}>{icon}</span>
      <h1 className="claim-notice-title">{title}</h1>
      <div className="claim-notice-body">{children}</div>
    </div>
  )
}

/* ── The address → name transformation ─────────────────────────────────── */

function Transformation({ address, name, slug }) {
  return (
    <div className="transform">
      <div className="transform-row">
        <span className="transform-label">Your wallet today</span>
        <span className="transform-hex">{address}</span>
      </div>
      <span className="transform-arrow" aria-hidden="true" />
      <div className="transform-row">
        <span className="transform-label">After you claim</span>
        <span className="transform-name">
          {name}<span className="transform-suffix">.{slug}.rwa-id.eth</span>
        </span>
      </div>
    </div>
  )
}

/* ── What the identity is actually for ─────────────────────────────────── */

function Utility({ slug, transferable }) {
  return (
    <dl className="utility">
      <div className="utility-item">
        <dt>One name, every wallet</dt>
        <dd>
          People can send you assets using the name instead of a 42-character address.
          It works in MetaMask, Rainbow, Trust and Uniswap — anything that reads ENS,
          not only {slug}.
        </dd>
      </div>
      <div className="utility-item">
        <dt>Issued by {slug}</dt>
        <dd>
          {slug} allowlisted your wallet, and the record of that sits on Ethereum where
          anyone can check it. The name is evidence they onboarded you.
        </dd>
      </div>
      <div className="utility-item">
        <dt>Held in your wallet</dt>
        <dd>
          It is minted to you and lives in your wallet, not on a platform server.{' '}
          {transferable
            ? 'You can transfer it later if you need to.'
            : 'It is soulbound — it cannot be transferred or sold.'}
        </dd>
      </div>
    </dl>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function ClaimPage({ projectId, cid }) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const pid = BigInt(projectId)

  const [proofs, setProofs] = useState(null)
  const [ipfsError, setIpfsError] = useState('')
  const [ipfsLoading, setIpfsLoading] = useState(true)
  const [slowClaim, setSlowClaim] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIpfsLoading(true)
    setIpfsError('')
    fetchProofSet(cid)
      .then(data => { if (!cancelled) { setProofs(data); setIpfsLoading(false) } })
      .catch(err => {
        if (cancelled) return
        setIpfsError(err.message || 'Could not load the allowlist for this link.')
        setIpfsLoading(false)
      })
    return () => { cancelled = true }
  }, [cid])

  const { data: projectRaw } = useReadContract({
    address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'projects', args: [pid],
  })
  const project = parseProject(projectRaw)

  const { data: minFee } = useReadContract({
    address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'minimumClaimFee',
  })

  const { data: hasClaimed, refetch: refetchClaimed } = useReadContract({
    address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'claimed', args: [pid, address],
    query: { enabled: !!address },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'allowance', args: [address, RWAID_ADDRESS],
    query: { enabled: !!address },
  })

  const { data: balance } = useReadContract({
    address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'balanceOf', args: [address],
    query: { enabled: !!address },
  })

  const fee = effectiveFee(project, minFee)
  const entry = isConnected && proofs
    ? proofs.entries?.find(e => (e.wallet || e.address)?.toLowerCase() === address?.toLowerCase())
    : null

  const approved = allowance !== undefined && allowance >= fee
  const funded = balance !== undefined && balance >= fee

  const { writeContract: writeApprove, data: approveHash, isPending: approvePending, error: approveError } = useWriteContract()
  const { isLoading: approveConfirming, data: approveReceipt } = useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract: writeClaim, data: claimHash, isPending: claimPending, error: claimError } = useWriteContract()
  const { isLoading: claimConfirming, data: claimReceipt } = useWaitForTransactionReceipt({ hash: claimHash })

  // A receipt arriving is not the same as the call succeeding — a reverted
  // transaction still produces one, so keying success off the query alone
  // reported "identity claimed" for claims that never happened.
  const claimDone = claimReceipt?.status === 'success'
  const claimReverted = claimReceipt?.status === 'reverted'

  useEffect(() => { if (approveReceipt?.status === 'success') refetchAllowance() }, [approveReceipt, refetchAllowance])
  useEffect(() => { if (claimDone) refetchClaimed() }, [claimDone, refetchClaimed])

  // Waiting indefinitely with no explanation is the worst version of this screen:
  // a transaction that never reaches the network looks identical to a slow one.
  useEffect(() => {
    if (!claimConfirming) { setSlowClaim(false); return }
    const t = setTimeout(() => setSlowClaim(true), 45_000)
    return () => clearTimeout(t)
  }, [claimConfirming])

  const handleDisconnect = async () => {
    try { await modal.disconnect() } catch { /* already closed */ }
    try { disconnect() } catch { /* already gone */ }
  }

  const slug = project?.slug
  const shell = (children) => (
    <Shell slug={slug} address={isConnected ? address : null} onDisconnect={handleDisconnect}>
      {children}
    </Shell>
  )

  /* ── Loading ── */
  if (ipfsLoading || !project) {
    return shell(
      <Notice icon={<span className="spinner lg" />} title="Checking your eligibility">
        Reading the allowlist from IPFS and the registry from Ethereum mainnet.
      </Notice>,
    )
  }

  /* ── Broken link ── */
  if (ipfsError) {
    return shell(
      <Notice tone="danger" icon={<Warning size={22} />} title="This link is not working">
        {ipfsError} Ask {slug || 'the platform that sent it'} for a fresh claim link.
      </Notice>,
    )
  }

  /* ── Claimed ── */
  if (hasClaimed || claimDone) {
    const name = entry?.name
    const full = name ? `${name}.${slug}.rwa-id.eth` : null
    return shell(
      <div className="claim-done">
        <IdentityCard name={full || `${slug}.rwa-id.eth`} />
        <div className="claim-done-copy">
          <span className="claim-eyebrow good"><Check size={12} />Claimed</span>
          <h1 className="claim-h1 sm">{full || 'Identity claimed'}</h1>
          <p className="claim-lede">
            It is live on Ethereum mainnet and held by {shortAddress(address)}. Try it in
            any ENS-aware wallet — type the name where you would normally paste your
            address.
          </p>
          <div className="claim-links">
            {full && (
              <a className="btn btn-ink" href={`https://app.ens.domains/${full}`} target="_blank" rel="noreferrer">
                View in ENS<External size={12} />
              </a>
            )}
            {claimHash && (
              <a className="btn" href={`https://etherscan.io/tx/${claimHash}`} target="_blank" rel="noreferrer">
                Transaction<External size={12} />
              </a>
            )}
          </div>
        </div>
      </div>,
    )
  }

  /* ── Not connected ── */
  if (!isConnected) {
    return shell(
      <div className="claim-layout">
        <div className="claim-pitch">
          <span className="claim-eyebrow">Issued by {slug}</span>
          <h1 className="claim-h1">Your wallet,<br />with a name on it</h1>
          <p className="claim-lede">
            {slug} has reserved a name for you under <code>{slug}.rwa-id.eth</code>.
            Connect the wallet they allowlisted to see which name is yours.
          </p>
          <button className="btn btn-ink btn-lg" onClick={() => modal.open()}>
            Connect wallet<ArrowRight size={14} />
          </button>
          <Utility slug={slug} transferable={project.transferable} />
        </div>
        <aside className="claim-aside">
          <IdentityCard name={`you.${slug}.rwa-id.eth`} pending />
          <p className="claim-aside-note">
            Every identity mints with its artwork stored on Ethereum itself — no image
            server to go down, nothing to keep alive.
          </p>
        </aside>
      </div>,
    )
  }

  /* ── Connected, not allowlisted ── */
  if (!entry) {
    return shell(
      <Notice tone="neutral" icon={<Close size={22} width={2} />} title="This wallet is not on the allowlist">
        <p>
          {shortAddress(address)} is not in the proof set for {slug}. If you have more
          than one wallet, try the one you gave them — otherwise ask {slug} to add you
          and re-publish.
        </p>
        <button className="btn" onClick={handleDisconnect} style={{ marginTop: 18 }}>
          Try another wallet
        </button>
      </Notice>,
    )
  }

  const full = `${entry.name}.${slug}.rwa-id.eth`

  /* ── Paused ── */
  if (!project.active) {
    return shell(
      <Notice tone="warn" icon={<Pause size={20} />} title="Claiming is paused">
        {slug} has paused new claims. Your place is unaffected —{' '}
        <span className="mono">{full}</span> is still reserved for this wallet and you can
        claim it when they reopen.
      </Notice>,
    )
  }

  const busy = approvePending || approveConfirming || claimPending || claimConfirming
  const error = approveError || claimError

  return shell(
    <div className="claim-layout">
      <div className="claim-pitch">
        <span className="claim-eyebrow">Issued by {slug}</span>
        <h1 className="claim-h1">Your wallet,<br />with a name on it</h1>
        <Transformation address={address} name={entry.name} slug={slug} />
        <Utility slug={slug} transferable={project.transferable} />
      </div>

      <aside className="claim-aside">
        <IdentityCard name={full} pending />

        <dl className="claim-facts">
          <div><dt>Name</dt><dd className="mono">{full}</dd></div>
          <div><dt>One-time fee</dt><dd>{usd(fee)} USDC</dd></div>
          <div><dt>Type</dt><dd>{project.transferable ? 'Transferable' : 'Soulbound'}</dd></div>
        </dl>

        {!funded ? (
          <div className="notice notice-warn">
            <Warning size={14} />
            <span>
              Claiming costs {usd(fee)} USDC and {shortAddress(address)} holds{' '}
              {balance !== undefined ? usd(balance) : '—'}. Top up and reload this page.
            </span>
          </div>
        ) : (
          <div className="claim-action">
            <div className="claim-steps">
              <div className={`claim-step ${approved ? 'is-done' : 'is-current'}`}>
                <span className="claim-step-num">{approved ? <Check size={11} /> : '1'}</span>
                Approve {usd(fee)} USDC
              </div>
              <div className={`claim-step ${approved ? 'is-current' : ''}`}>
                <span className="claim-step-num">2</span>
                Claim your name
              </div>
            </div>

            {!approved ? (
              <button
                className="btn btn-ink btn-full btn-lg"
                disabled={busy}
                onClick={() => writeApprove({
                  address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'approve',
                  args: [RWAID_ADDRESS, fee],
                })}
              >
                {approvePending ? 'Confirm in your wallet…'
                  : approveConfirming ? 'Approving…'
                  : `Approve ${usd(fee)} USDC`}
              </button>
            ) : (
              <button
                className="btn btn-ink btn-full btn-lg"
                disabled={busy}
                onClick={() => writeClaim({
                  address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'claim',
                  args: [pid, entry.name, entry.proof],
                })}
              >
                {claimPending ? 'Confirm in your wallet…'
                  : claimConfirming ? 'Minting your identity…'
                  : <>Claim this name<ArrowRight size={14} /></>}
              </button>
            )}

            {slowClaim && claimConfirming && (
              <div className="notice notice-warn">
                <Warning size={14} />
                <span>
                  This is taking longer than usual. The transaction may not have reached
                  the network — check the activity list in your wallet, and reload this
                  page to start again if nothing is pending there.
                </span>
              </div>
            )}

            {claimReverted && (
              <div className="notice notice-danger">
                <Warning size={14} />
                <span>The claim was rejected on-chain and no name was minted. You were not charged the fee.</span>
              </div>
            )}

            {error && (
              <div className="notice notice-danger">
                <Warning size={14} />
                <span>{errorText(error)}</span>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>,
  )
}
