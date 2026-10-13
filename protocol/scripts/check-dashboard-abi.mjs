/**
 * Guards the console's hand-written ABI against the compiled contract.
 *
 *   npx hardhat compile && node scripts/check-dashboard-abi.mjs
 *
 * The dashboard declares its own ABI rather than importing artifacts, so a
 * signature change (v3's claim(uint256,string,bytes32[]), the label added to
 * IdentityClaimed) can silently pass a build and only fail in a user's wallet.
 */
import { readFileSync } from 'fs'

const CONTRACT = process.env.CONTRACT || 'RWAIDv3'
const artifact = `artifacts/contracts/${CONTRACT}.sol/${CONTRACT}.json`
const dashboard = 'apps/rwa-id-dashboard/src/lib/contracts.js'

const real = JSON.parse(readFileSync(artifact, 'utf8')).abi

const src = readFileSync(dashboard, 'utf8')
const body = src.slice(src.indexOf('export const RWAID_ABI = ['))
const declared = eval(body.slice(body.indexOf('['), body.indexOf('\n]') + 2))

const sig  = (f) => `${f.name}(${(f.inputs || []).map(i => i.type).join(',')})`
const outs = (f) => (f.outputs || []).map(o => o.type).join(',')

const onchain = new Map(
  real.filter(f => f.type === 'function' || f.type === 'event').map(f => [`${f.type}:${sig(f)}`, f]),
)

let failed = 0
for (const f of declared) {
  if (f.type !== 'function' && f.type !== 'event') continue
  const key = `${f.type}:${sig(f)}`
  const match = onchain.get(key)

  if (!match) {
    console.error(`✗ ${key} — not present on ${CONTRACT}`)
    failed++
  } else if (f.type === 'function' && outs(f) !== outs(match)) {
    console.error(`✗ ${key} — outputs (${outs(f)}) ≠ contract (${outs(match)})`)
    failed++
  }
}

console.log(
  failed
    ? `\n${failed} mismatch(es) against ${CONTRACT}`
    : `${declared.filter(f => f.type).length} ABI entries match ${CONTRACT}`,
)
process.exit(failed ? 1 : 0)
