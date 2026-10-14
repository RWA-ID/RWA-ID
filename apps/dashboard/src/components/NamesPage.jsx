import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { bytesToHex, getAddress, hexToBytes, isAddress, namehash } from 'viem'
import { modal } from '../lib/wagmi'
import { RWAID_ADDRESS, RWAID_ABI, RECORDS_ADDRESS, RECORDS_ABI, TRANSFER_EVENT } from '../lib/contracts'
import { explorerAddress, explorerToken } from '../lib/chain'
import { readClient, getLogsChunked } from '../lib/readClient'
import { errorText, shortAddress } from '../lib/format'
import { SiteFooter, SiteHeader } from './SiteChrome'
import TxDrawer, { useTx } from './TxDrawer'

const EVM_DEFAULT = 0x80000000n

// The records a holder can set. ETH is not here: it is always the holding wallet.
const COINS = [
  { coinType: 0n, key: 'btc', label: 'Bitcoin', placeholder: 'bc1q…', kind: 'encoder' },
  { coinType: 501n, key: 'sol', label: 'Solana', placeholder: 'So1…', kind: 'encoder' },
  { coinType: EVM_DEFAULT, key: 'evm', label: 'Other EVM chains', placeholder: '0x… (defaults to this wallet)', kind: 'evm' },
]
const TEXTS = [
  { key: 'url', label: 'Website', placeholder: 'https://…' },
  { key: 'email', label: 'Email', placeholder: 'you@example.com' },
  { key: 'com.twitter', label: 'X / Twitter', placeholder: 'handle' },
  { key: 'description', label: 'Description', placeholder: 'A short line about this wallet' },
]

// ENSIP-9 binary formats come from ENS's own encoder, loaded only when needed.
const coder = async (coinType) => (await import('@ensdomains/address-encoder')).getCoderByCoinType(Number(coinType))

async function toBytes(coin, value) {
  const v = value.trim()
  if (!v) return '0x'
  if (coin.kind === 'evm') {
    if (!isAddress(v)) throw new Error(`${coin.label}: not a valid 0x address`)
    return getAddress(v).toLowerCase()
  }
  try {
    return bytesToHex((await coder(coin.coinType)).decode(v))
  } catch {
    throw new Error(`${coin.label}: that is not a valid ${coin.label} address`)
  }
}

async function fromBytes(coin, hex) {
  if (!hex || hex === '0x') return ''
  if (coin.kind === 'evm') return getAddress(hex)
  try { return (await coder(coin.coinType)).encode(hexToBytes(hex)) } catch { return hex }
}

/** Names this wallet holds on RWAIDv4, found from Transfer logs (the registry is not enumerable). */
async function loadNames(address) {
  const logs = await getLogsChunked({ address: RWAID_ADDRESS, event: TRANSFER_EVENT, args: { to: address } })
  const ids = [...new Set(logs.map(l => l.args.tokenId))]
  if (!ids.length) return []
  const owners = await readClient.multicall({
    contracts: ids.map(id => ({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'ownerOf', args: [id] })),
    allowFailure: true, // a burned (revoked) token reverts ownerOf: it simply is not held
  })
  const held = ids.filter((_, i) => owners[i].status === 'success' && owners[i].result.toLowerCase() === address.toLowerCase())
  const names = await readClient.multicall({
    contracts: held.map(id => ({ address: RWAID_ADDRESS, abi: RWAID_ABI, functionName: 'fullName', args: [id] })),
    allowFailure: false,
  })
  return held.map((id, i) => ({ tokenId: id, name: names[i], node: namehash(names[i]) }))
}

function NameRecords({ entry, address }) {
  const [loaded, setLoaded] = useState(null)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null)
  const [drawer, setDrawer] = useState(false)
  const tx = useTx()

  const load = useCallback(async () => {
    const calls = [
      ...COINS.map(c => ({ address: RECORDS_ADDRESS, abi: RECORDS_ABI, functionName: 'addr', args: [entry.node, c.coinType] })),
      ...TEXTS.map(t => ({ address: RECORDS_ADDRESS, abi: RECORDS_ABI, functionName: 'text', args: [entry.node, t.key] })),
    ]
    const res = await readClient.multicall({ contracts: calls, allowFailure: false })
    const values = {}
    for (const [i, c] of COINS.entries()) values[c.key] = await fromBytes(c, res[i])
    for (const [i, t] of TEXTS.entries()) values[t.key] = res[COINS.length + i]
    setLoaded(values)
    setForm(values)
  }, [entry.node])

  useEffect(() => { load().catch(e => setError(errorText(e))) }, [load])

  const changed = useMemo(() => loaded && [...COINS, ...TEXTS].filter(f => (form[f.key] ?? '') !== (loaded[f.key] ?? '')), [form, loaded])

  const review = async () => {
    setError('')
    try {
      const coins = changed.filter(f => COINS.includes(f))
      const texts = changed.filter(f => TEXTS.includes(f))
      const addrs = await Promise.all(coins.map(c => toBytes(c, form[c.key] || '')))
      setPending({ coinTypes: coins.map(c => c.coinType), addrs, keys: texts.map(t => t.key), values: texts.map(t => (form[t.key] || '').trim()), fields: changed })
      setDrawer(true)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <span style={{ overflowWrap: 'anywhere' }}>{entry.name}</span>
        <a className="meta" href={explorerToken(RWAID_ADDRESS, entry.tokenId)} target="_blank" rel="noreferrer">token #{entry.tokenId.toString()} ↗</a>
      </div>
      <div className="card-body">
        <div className="kv well">
          <div className="kv-row"><span>Ethereum (and the default everywhere)</span><span>{shortAddress(address)} · this wallet</span></div>
        </div>
        {!loaded ? (
          <div className="row"><span className="spinner" /><span className="meta">Reading records…</span></div>
        ) : (
          <>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 12 }}>
              {COINS.map(c => (
                <label key={c.key} className="field">
                  <span className="label">{c.label}</span>
                  <input className="input" value={form[c.key] ?? ''} placeholder={c.placeholder} spellCheck="false"
                    onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} />
                </label>
              ))}
              {TEXTS.map(t => (
                <label key={t.key} className="field">
                  <span className="label">{t.label}</span>
                  <input className="input" style={{ fontFamily: 'var(--f-sans)' }} value={form[t.key] ?? ''} placeholder={t.placeholder}
                    onChange={(e) => setForm({ ...form, [t.key]: e.target.value })} />
                </label>
              ))}
            </div>
            <span className="note">
              Records belong to this wallet. If the name moves to another wallet or is revoked, they stop resolving automatically.
            </span>
            {error && <div className="notice danger"><span className="n-icon">!</span><span>{error}</span></div>}
            <div className="row">
              <button className="btn btn-lime" disabled={!changed?.length} onClick={review}>Save {changed?.length ? `${changed.length} change${changed.length === 1 ? '' : 's'}` : ''} →</button>
              {changed?.length > 0 && <button className="btn" onClick={() => setForm(loaded)}>Discard</button>}
            </div>
          </>
        )}
      </div>
      <TxDrawer
        open={drawer}
        onClose={() => { setDrawer(false); tx.reset() }}
        tx={tx}
        to={RECORDS_ADDRESS}
        title="Save records"
        summary={`Updates ${entry.name} on Robinhood Chain. Wallets see the change within minutes.`}
        rows={(pending?.fields ?? []).map(f => ({ k: f.label, v: (form[f.key] || '').trim() || 'cleared' }))}
        fn="setRecords(bytes32,uint256[],bytes[],string[],string[])"
        onSign={() => tx.writeContract({ address: RECORDS_ADDRESS, abi: RECORDS_ABI, functionName: 'setRecords', args: [entry.node, pending.coinTypes, pending.addrs, pending.keys, pending.values] })}
        onDone={() => { load() }}
      />
    </div>
  )
}

export default function NamesPage() {
  const { address, isConnected } = useAccount()
  const [names, setNames] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { document.title = 'My names · RWA ID' }, [])
  useEffect(() => {
    if (!address) { setNames(null); return }
    let cancelled = false
    setNames(null); setError('')
    loadNames(address).then(n => { if (!cancelled) setNames(n) }).catch(e => { if (!cancelled) setError(errorText(e)) })
    return () => { cancelled = true }
  }, [address])

  return (
    <>
      <SiteHeader />
      <div className="prose-wrap">
        <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="kicker">My names</span>
            <h1 className="display" style={{ fontSize: 'clamp(40px,5vw,64px)' }}>One name, every chain</h1>
            <p className="lede" style={{ maxWidth: 680 }}>
              Your RWA ID name always points to this wallet on Ethereum. Add your Bitcoin, Solana or other addresses and
              a few profile details, and every ENS-aware wallet and app shows them for your name.
            </p>
          </div>
          {!isConnected ? (
            <div className="card card-pad" style={{ alignItems: 'flex-start' }}>
              <span className="card-title">Connect the wallet that holds your name</span>
              <button className="btn btn-ink btn-lg" style={{ color: 'var(--lime)' }} onClick={() => modal.open()}>Connect wallet →</button>
            </div>
          ) : error ? (
            <div className="notice danger"><span className="n-icon">!</span><span>{error}</span></div>
          ) : names === null ? (
            <div className="row"><span className="spinner" /><span className="meta">Finding names held by {shortAddress(address)}…</span></div>
          ) : names.length === 0 ? (
            <div className="card card-pad">
              <span className="card-title">No RWA ID names in this wallet</span>
              <span className="note">
                {shortAddress(address)} holds no names on Robinhood Chain. If a platform sent you a claim link, open it to claim
                yours. <a href={explorerAddress(address)} target="_blank" rel="noreferrer">View wallet ↗</a>
              </span>
            </div>
          ) : (
            names.map(n => <NameRecords key={n.tokenId.toString()} entry={n} address={address} />)
          )}
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
