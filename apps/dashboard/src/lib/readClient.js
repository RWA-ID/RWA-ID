import { createPublicClient, fallback, http } from 'viem'
import { robinhoodChain, ROBINHOOD_RPCS } from './chain'
import { DEPLOY_BLOCK } from './contracts'

/**
 * Reads go straight to Robinhood Chain's public endpoints, never through the
 * wallet: WalletConnect's relay refuses eth_getLogs, and a read should not
 * depend on which wallet happens to be connected.
 */
export const readClient = createPublicClient({
  chain: robinhoodChain,
  transport: fallback(ROBINHOOD_RPCS.map(url => http(url, { timeout: 12_000 })), { rank: false }),
})

/**
 * eth_getLogs from the v4 deploy block, failing over across providers.
 *
 * Window size is the first thing public RPCs restrict, so a provider that
 * refuses the whole range is retried in 50k-block windows before moving on.
 * Throws if every provider refuses — callers must surface that rather than
 * rendering an empty result as "no activity".
 */
const WINDOW = 50_000n

export async function getLogsChunked(filter) {
  const from = filter.fromBlock ?? DEPLOY_BLOCK
  const head = await readClient.getBlockNumber()
  const failures = []

  for (const url of ROBINHOOD_RPCS) {
    const client = createPublicClient({ chain: robinhoodChain, transport: http(url, { timeout: 20_000, retryCount: 1 }) })
    try {
      return await client.getLogs({ ...filter, fromBlock: from, toBlock: head })
    } catch (whole) {
      try {
        const logs = []
        for (let start = from; start <= head; start += WINDOW) {
          const end = start + WINDOW - 1n > head ? head : start + WINDOW - 1n
          logs.push(...await client.getLogs({ ...filter, fromBlock: start, toBlock: end }))
        }
        return logs
      } catch (err) {
        failures.push(`${new URL(url).hostname}: ${err.shortMessage || err.message || whole.shortMessage}`)
      }
    }
  }
  throw new Error(`No RPC would serve event logs — ${failures.join(' · ')}`)
}
