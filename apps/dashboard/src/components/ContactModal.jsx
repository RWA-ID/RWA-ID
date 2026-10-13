import { useEffect, useState } from 'react'
import { Check, Close, Warning } from './icons'

// Web3Forms takes FormData only — do not switch this to a JSON body.
const ACCESS_KEY = 'c4621259-2059-4c10-8cb4-d6e8cba3d236'

export default function ContactModal({ onClose }) {
  const [result, setResult]   = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onSubmit = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    setSending(true)
    setResult('')
    const formData = new FormData(form)
    formData.append('access_key', ACCESS_KEY)
    try {
      const res  = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) { setResult('success'); form.reset() }
      else setResult('error')
    } catch {
      setResult('error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Book a walkthrough">
      <div className="overlay" onClick={onClose} />
      <div className="modal">
        <div className="card-head" style={{ padding: '20px 24px' }}>
          <div>
            <div style={{ font: '600 18px/1.25 var(--f-sans)', letterSpacing: '-.02em' }}>Book a walkthrough</div>
            <div className="mono-note" style={{ marginTop: 4 }}>We&apos;ll show you how RWA-ID fits your platform</div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close"><Close size={12} /></button>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          {result === 'success' ? (
            <div className="notice notice-good" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 24 }}>
              <span style={{
                width: 40, height: 40, borderRadius: '50%', background: 'var(--good)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={18} width={2} />
              </span>
              <div style={{ font: '600 16px/1.3 var(--f-sans)', color: 'var(--ink)' }}>Request received</div>
              <div style={{ font: '400 13px/1.5 var(--f-sans)' }}>We&apos;ll be in touch within one business day.</div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="card-stack">
              <input type="hidden" name="subject" value="RWA-ID Walkthrough Request" />

              <div className="field">
                <label className="label" htmlFor="wt-name">Name</label>
                <div className="input-shell">
                  <input id="wt-name" type="text" name="name" placeholder="Jane Smith" required
                    style={{ fontFamily: 'var(--f-sans)' }} />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="wt-email">Work email</label>
                <div className="input-shell">
                  <input id="wt-email" type="email" name="email" placeholder="jane@yourfirm.com" required
                    style={{ fontFamily: 'var(--f-sans)' }} />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="wt-org">Organization</label>
                <div className="input-shell">
                  <input id="wt-org" type="text" name="organization" placeholder="e.g. Acme Capital"
                    style={{ fontFamily: 'var(--f-sans)' }} />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="wt-msg">Tell us about your use case</label>
                <textarea
                  id="wt-msg"
                  name="message"
                  className="textarea"
                  placeholder="What kind of identities are you looking to issue? How many clients?"
                  required
                />
              </div>

              {result === 'error' && (
                <div className="notice notice-danger">
                  <Warning size={14} />
                  <span>Something went wrong — please try again, or email partner@rwa-id.com directly.</span>
                </div>
              )}

              <button type="submit" disabled={sending} className="btn btn-ink btn-full">
                {sending ? 'Sending…' : 'Send request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
