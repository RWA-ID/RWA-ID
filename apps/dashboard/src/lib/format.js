import { formatUnits } from 'viem'

export const ZERO_ROOT = '0x0000000000000000000000000000000000000000000000000000000000000000'

// USDC has 6 decimals everywhere in this app.
export function usd(value, { decimals = 2 } = {}) {
  const n = typeof value === 'bigint' ? Number(formatUnits(value, 6)) : Number(value || 0)
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// Compact money for headline stats — no cents once past a dollar.
export function usdCompact(value) {
  const n = typeof value === 'bigint' ? Number(formatUnits(value, 6)) : Number(value || 0)
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: n < 1 ? 2 : 0 })
}

export function num(n) {
  return Number(n || 0).toLocaleString('en-US')
}

export function shortAddress(addr, lead = 6, tail = 4) {
  if (!addr) return '—'
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`
}

export function shortHash(hash, lead = 6, tail = 4) {
  if (!hash || hash === ZERO_ROOT) return 'not set'
  return `${hash.slice(0, lead)}…${hash.slice(-tail)}`
}

export function initials(slug = '') {
  const parts = slug.split(/[-_. ]+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// Deterministic tint per project so the same namespace keeps its colour.
const TINTS = ['#1D4ED8', '#0F7A52', '#8A5A00', '#6D28D9', '#B3261E', '#0E7490']
export function tint(id) {
  return TINTS[Math.abs(Number(id) || 0) % TINTS.length]
}

export function pct(claimed, total) {
  if (!total) return null
  return Math.round((Number(claimed) / Number(total)) * 100)
}

export function relativeTime(seconds) {
  if (!seconds) return '—'
  const diff = Math.floor(Date.now() / 1000) - Number(seconds)
  if (diff < 60) return 'just now'
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export const DEFAULT_PROTOCOL_FEE_PERCENT = 30n

// `Project.totalRevenue` accumulates the *gross* fee every claimer paid, but the
// treasury only ever received the platform side of the split — the protocol cut
// went straight to the protocol treasury and never touched this address. Mirror
// the contract's own arithmetic so the console reports money actually received.
//
// The contract floors the protocol share per claim; we can only floor once over
// the lifetime total, so this can read a few micro-USDC low against a
// claim-by-claim sum. That is well under a cent and never overstates.
export function treasuryShare(grossRevenue, protocolFeePercent) {
  const gross = BigInt(grossRevenue ?? 0n)
  const percent = BigInt(protocolFeePercent ?? DEFAULT_PROTOCOL_FEE_PERCENT)
  return gross - (gross * percent) / 100n
}

// The treasury's side of the split, as a whole percent — for labels like "70%".
export function treasuryPercent(protocolFeePercent) {
  return 100 - Number(protocolFeePercent ?? DEFAULT_PROTOCOL_FEE_PERCENT)
}

// The contract treats claimFee == 0 as "inherit the protocol minimum".
export function effectiveFee(project, minimumFee) {
  if (!project) return minimumFee ?? 500000n
  return project.claimFee > 0n ? project.claimFee : (minimumFee ?? 500000n)
}

export function errorText(err) {
  if (!err) return ''
  return err.shortMessage || err.details || err.message || String(err)
}
