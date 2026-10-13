import { createPublicClient, fallback, http } from 'viem'
import { mainnet } from 'viem/chains'

// RWAIDv3 deployment block. Narrows getLogs queries to avoid scanning
// irrelevant history — there is nothing to find before the contract existed.
export const CONTRACT_START_BLOCK = 25_661_280n

/**
 * Endpoints used for eth_call / multicall. Any node serves these, so this list
 * is only about staying up when one provider rate-limits us.
 */
const CALL_RPCS = [
  'https://ethereum.publicnode.com',
  'https://eth.api.onfinality.io/public',
  'https://eth.drpc.org',
  'https://rpc.mevblocker.io',
]

export const readClient = createPublicClient({
  chain: mainnet,
  transport: fallback(CALL_RPCS.map(url => http(url, { timeout: 12_000 })), { rank: false }),
})

/**
 * Endpoints used for eth_getLogs, in preference order.
 *
 * Historical log queries are the first thing free RPCs withdraw: publicnode now
 * answers every archive-range getLogs with "Archive requests require a personal
 * token", which is what silently emptied the allowlist counts, the claim funnel
 * and the activity feed. `range` is the provider's max span per request
 * (null = unlimited), so the provider needing fewest round-trips is tried first.
 */
const LOG_RPCS = [
  { url: 'https://eth.api.onfinality.io/public', range: null },
  { url: 'https://rpc.mevblocker.io',            range: null },
  { url: 'https://rpc.flashbots.net',            range: 100_000n },
  { url: 'https://eth.drpc.org',                 range: 10_000n },
]

const logProviders = LOG_RPCS.map(({ url, range }) => ({
  url,
  range,
  client: createPublicClient({
    chain: mainnet,
    transport: http(url, { timeout: 20_000, retryCount: 1 }),
  }),
}))

// The first provider that answers is reused for the rest of the session.
let preferred = null

async function scan({ client, range }, filter, fromBlock, toBlock) {
  if (!range) return client.getLogs({ ...filter, fromBlock, toBlock })

  const logs = []
  for (let start = fromBlock; start <= toBlock; start += range) {
    const end = start + range - 1n > toBlock ? toBlock : start + range - 1n
    logs.push(...await client.getLogs({ ...filter, fromBlock: start, toBlock: end }))
  }
  return logs
}

/**
 * Fetch all logs matching `filter`, failing over across providers.
 * Throws if every provider refuses — callers must surface that rather than
 * rendering an empty result as "no activity".
 */
export async function getLogsChunked(filter) {
  const from = filter.fromBlock ?? CONTRACT_START_BLOCK
  const head = await readClient.getBlockNumber()

  const ordered = preferred
    ? [preferred, ...logProviders.filter(p => p !== preferred)]
    : logProviders

  const failures = []
  for (const provider of ordered) {
    try {
      const logs = await scan(provider, filter, from, head)
      preferred = provider
      return logs
    } catch (err) {
      failures.push(`${new URL(provider.url).hostname}: ${err.shortMessage || err.message}`)
    }
  }

  throw new Error(`No RPC would serve event logs — ${failures.join(' · ')}`)
}
