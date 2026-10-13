import { useEffect, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { RWAID_ADDRESS } from '../lib/contracts'
import { errorText, num } from '../lib/format'
import { Check, Close, Warning } from './icons'

/**
 * Wraps a single contract write so every panel drives the drawer the same way.
 * Panels own the hook; the drawer is presentation + guardrails.
 */
export function useTx() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, data: receipt } =
    useWaitForTransactionReceipt({ hash })

  const stage = isSuccess ? 'done'
    : isConfirming ? 'pending'
    : isPending ? 'signing'
    : 'review'

  return { writeContract, hash, isPending, isConfirming, isSuccess, receipt, error, reset, stage }
}

const STAGE_COPY = {
  signing: { label: 'Waiting for your wallet…', meta: 'confirm in wallet' },
  pending: { label: 'Broadcasting to Ethereum…', meta: 'waiting for a block' },
}

/**
 * @param {object}   tx        - the object returned by useTx()
 * @param {string}   title     - drawer heading
 * @param {string}   summary   - one-line plain-language description of the effect
 * @param {Array}    rows      - [{ k, v, tone }] state-change table (before → after)
 * @param {string}   fn        - contract function signature shown under CALL
 * @param {boolean}  danger    - red treatment + requires typed confirmation
 * @param {string}   warning   - danger copy
 * @param {string}   confirmWord - word the operator must type when danger
 * @param {function} onSign    - fires the write
 * @param {function} onDone    - called when the operator dismisses a confirmed tx
 */
export default function TxDrawer({
  open, onClose, tx, title, summary, rows = [], fn,
  danger = false, warning, confirmWord = 'CONFIRM',
  ctaLabel = 'Sign in wallet', onSign, onDone, children,
}) {
  const [typed, setTyped] = useState('')
  const [ack, setAck]     = useState(false)

  // Reset guardrails whenever a fresh drawer opens.
  useEffect(() => {
    if (open) { setTyped(''); setAck(false) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && tx.stage === 'review') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, tx.stage])

  if (!open) return null

  const canSign = danger
    ? typed.trim().toUpperCase() === confirmWord.toUpperCase()
    : ack

  const handleDone = () => { onDone?.(); onClose() }
  const busy = tx.stage === 'signing' || tx.stage === 'pending'

  return (
    <div className="drawer-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="overlay" onClick={() => !busy && onClose()} />
      <div className="drawer">
        <div className="drawer-head">
          <span>{title}</span>
          <button className="close-btn" onClick={onClose} disabled={busy} aria-label="Close">
            <Close size={12} />
          </button>
        </div>

        <div className="drawer-body">
          <div className={`notice ${danger ? 'notice-danger' : 'notice-good'}`}>
            {danger ? <Warning size={14} /> : <Check size={14} />}
            <span style={{ fontWeight: 500 }}>{summary}</span>
          </div>

          {rows.length > 0 && (
            <div>
              <div className="mono-label" style={{ marginBottom: 12 }}>State change</div>
              <div className="tbl">
                {rows.map((r) => (
                  <div key={r.k} className="kv-row" style={{ padding: '12px 14px' }}>
                    <span className="kv-key">{r.k}</span>
                    <span className={`kv-val ${r.tone || ''}`}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mono-label" style={{ marginBottom: 12 }}>Call</div>
            <div className="code-block" style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>
              <div className="dim">contract</div>{RWAID_ADDRESS}
              <div className="dim" style={{ marginTop: 9 }}>function</div>
              <span style={{ color: 'var(--accent)' }}>{fn}</span>
              <div className="dim" style={{ marginTop: 9 }}>network</div>Ethereum mainnet
            </div>
          </div>

          {children}

          {danger ? (
            <div className="notice notice-danger" style={{ flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <Warning size={15} />
                <div>{warning}</div>
              </div>
              <div>
                <label className="label" style={{ color: 'var(--danger-ink)', fontWeight: 400, fontSize: 11.5 }}>
                  Type <strong className="mono">{confirmWord}</strong> to enable signing
                </label>
                <input
                  className="input-row is-invalid"
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13 }}
                  placeholder={confirmWord}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  disabled={busy || tx.stage === 'done'}
                />
              </div>
            </div>
          ) : (
            <label className="checkbox-row">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)}
                disabled={busy || tx.stage === 'done'} />
              <span>I have reviewed the state change above and understand it is written to Ethereum mainnet.</span>
            </label>
          )}

          {tx.error && (
            <div className="notice notice-danger">
              <Warning size={14} />
              <span>{errorText(tx.error)}</span>
            </div>
          )}
        </div>

        <div className="drawer-foot">
          {tx.stage === 'review' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button
                className={`btn ${danger ? 'btn-danger' : 'btn-accent'}`}
                style={{ flex: 1 }}
                onClick={onSign}
                disabled={!canSign}
              >
                {ctaLabel}
              </button>
            </div>
          )}

          {busy && (
            <div className="row" style={{ padding: 2 }}>
              <span className="spinner" />
              <span style={{ font: '500 13px/1.4 var(--f-sans)' }}>{STAGE_COPY[tx.stage].label}</span>
              <span className="mono-note" style={{ marginLeft: 'auto' }}>{STAGE_COPY[tx.stage].meta}</span>
            </div>
          )}

          {tx.stage === 'done' && (
            <div className="row">
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flex: 'none',
                background: 'var(--good-bg)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--good)',
              }}>
                <Check size={12} width={2} />
              </span>
              <span style={{ font: '500 13px/1.4 var(--f-sans)', color: 'var(--good-deep)' }}>
                Confirmed in block {num(tx.receipt?.blockNumber)}
              </span>
              <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={handleDone}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
