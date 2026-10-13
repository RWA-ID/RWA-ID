import { useCallback, useEffect, useState } from 'react'
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { RWAID_ADDRESS } from '../lib/contracts'
import { explorerTx, ROBINHOOD_CHAIN_ID } from '../lib/chain'
import { errorText, num } from '../lib/format'

/**
 * Wraps a single contract write so every panel drives the drawer the same way.
 *
 * A receipt is not success: a reverted transaction still produces one, and
 * wagmi's isSuccess only means "a receipt arrived". Stage 'done' therefore
 * requires receipt.status === 'success'; a revert is its own stage.
 */
export function useTx() {
  const { writeContract: write, data: hash, isPending, error, reset: resetWrite } = useWriteContract()
  const { isLoading: isConfirming, data: receipt, error: receiptError } = useWaitForTransactionReceipt({ hash, chainId: ROBINHOOD_CHAIN_ID })
  const { chainId } = useAccount()
  const { switchChainAsync, isPending: switching } = useSwitchChain()
  const [switchError, setSwitchError] = useState(null)

  // Every write is pinned to Robinhood Chain. A wallet sitting on another
  // network is asked to switch first rather than failing with a chain mismatch.
  const writeContract = useCallback(async (args) => {
    setSwitchError(null)
    try {
      if (chainId !== ROBINHOOD_CHAIN_ID) await switchChainAsync({ chainId: ROBINHOOD_CHAIN_ID })
    } catch (err) {
      setSwitchError(new Error(`Switch your wallet to Robinhood Chain to continue. ${errorText(err)}`))
      return
    }
    write({ ...args, chainId: ROBINHOOD_CHAIN_ID })
  }, [chainId, switchChainAsync, write])

  const reset = useCallback(() => { setSwitchError(null); resetWrite() }, [resetWrite])

  const stage = receipt?.status === 'success' ? 'done'
    : receipt?.status === 'reverted' ? 'reverted'
    : isConfirming ? 'pending'
    : isPending || switching ? 'signing'
    : 'review'

  return { writeContract, hash, receipt, error: switchError || error || receiptError, reset, stage, isConfirming, isPending }
}

const STAGE_COPY = {
  signing: { label: 'Waiting for your wallet…', meta: 'confirm in wallet' },
  pending: { label: 'Sending to Robinhood Chain…', meta: 'waiting for a block' },
}

/**
 * @param {object}   tx          the object returned by useTx()
 * @param {string}   summary     one-line plain-language description of the effect
 * @param {Array}    rows        [{ k, v }] state-change table
 * @param {string}   fn          contract function signature shown under CALL
 * @param {string}   to          contract called (defaults to the registry)
 * @param {boolean}  danger      orange treatment + typed confirmation
 */
export default function TxDrawer({
  open, onClose, tx, title, summary, rows = [], fn, to = RWAID_ADDRESS,
  danger = false, warning, confirmWord = 'CONFIRM',
  ctaLabel = 'Sign in wallet', onSign, onDone, children,
}) {
  const [typed, setTyped] = useState('')
  const [ack, setAck]     = useState(false)

  useEffect(() => { if (open) { setTyped(''); setAck(false) } }, [open])

  const busy = tx.stage === 'signing' || tx.stage === 'pending'

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, busy])

  if (!open) return null

  const canSign = danger ? typed.trim().toUpperCase() === confirmWord.toUpperCase() : ack
  const handleDone = () => { onDone?.(); onClose() }

  return (
    <div className="drawer-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="overlay" onClick={() => !busy && onClose()} />
      <div className="drawer">
        <div className="drawer-head">
          <span>{title}</span>
          <button className="icon-x" onClick={onClose} disabled={busy} aria-label="Close">✕</button>
        </div>

        <div className="drawer-body">
          <div className={`notice ${danger ? 'danger' : 'good'}`}>
            <span className="n-icon">{danger ? '!' : '✓'}</span>
            <span style={{ fontWeight: 600 }}>{summary}</span>
          </div>

          {rows.length > 0 && (
            <div className="card">
              <div className="card-head">State change</div>
              <div className="kv" style={{ padding: '4px 20px 10px' }}>
                {rows.map(r => (
                  <div key={r.k} className="kv-row"><span>{r.k}</span><span style={r.tone === 'danger' ? { color: 'var(--orange-deep)' } : undefined}>{r.v}</span></div>
                ))}
              </div>
            </div>
          )}

          <div className="code">
            <div className="dim">contract</div>{to}
            <div className="dim" style={{ marginTop: 9 }}>function</div><span className="hl">{fn}</span>
            <div className="dim" style={{ marginTop: 9 }}>network</div>Robinhood Chain (4663)
          </div>

          {children}

          {danger ? (
            <div className="notice danger" style={{ flexDirection: 'column' }}>
              <span>{warning}</span>
              <label className="field" style={{ width: '100%' }}>
                <span className="label" style={{ color: 'var(--orange-deep)' }}>Type {confirmWord} to enable signing</span>
                <input className="input bad" placeholder={confirmWord} value={typed}
                  onChange={(e) => setTyped(e.target.value)} disabled={busy || tx.stage === 'done'} />
              </label>
            </div>
          ) : (
            <button type="button" className={`check${ack ? ' on' : ''}`} onClick={() => setAck(a => !a)} disabled={busy || tx.stage === 'done'}>
              <span className="box">{ack ? '✓' : ''}</span>
              I have reviewed the change above and understand it is written to Robinhood Chain.
            </button>
          )}

          {tx.error && tx.stage !== 'done' && (
            <div className="notice danger"><span className="n-icon">!</span><span>{errorText(tx.error)}</span></div>
          )}
          {tx.stage === 'reverted' && (
            <div className="notice danger">
              <span className="n-icon">!</span>
              <span>The transaction was rejected on-chain and nothing changed. <a href={explorerTx(tx.hash)} target="_blank" rel="noreferrer">View it ↗</a></span>
            </div>
          )}
        </div>

        <div className="drawer-foot">
          {(tx.stage === 'review' || tx.stage === 'reverted') && (
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className={`btn ${danger ? 'btn-orange' : 'btn-lime'}`} style={{ flex: 1 }}
                onClick={() => { if (tx.stage === 'reverted') tx.reset(); onSign() }} disabled={!canSign}>
                {tx.stage === 'reverted' ? 'Try again' : ctaLabel}
              </button>
            </div>
          )}
          {busy && (
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <span className="spinner" />
              <span style={{ fontWeight: 600 }}>{STAGE_COPY[tx.stage].label}</span>
              <span className="meta" style={{ marginLeft: 'auto' }}>{STAGE_COPY[tx.stage].meta}</span>
            </div>
          )}
          {tx.stage === 'done' && (
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <span className="pill lime ring">✓</span>
              <span style={{ fontWeight: 600 }}>
                Confirmed in block {num(tx.receipt?.blockNumber)} · <a href={explorerTx(tx.hash)} target="_blank" rel="noreferrer">tx ↗</a>
              </span>
              <button className="btn btn-sm btn-ink" style={{ marginLeft: 'auto' }} onClick={handleDone}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
