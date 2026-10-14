import { defineChain } from '@reown/appkit/networks'

export const ROBINHOOD_CHAIN_ID = 4663

/**
 * Public Robinhood Chain endpoints, in preference order. All three answer
 * browser POSTs with a single `access-control-allow-origin: *` (checked
 * 2026-10-13), and the chain's own RPC serves eth_getLogs from the v4 deploy
 * block to head in one call.
 */
export const ROBINHOOD_RPCS = import.meta.env.VITE_ROBINHOOD_RPC
  // Test builds only: point every read at one node (a local fork of the chain).
  ? [import.meta.env.VITE_ROBINHOOD_RPC]
  : [
      'https://rpc.mainnet.chain.robinhood.com',
      'https://robinhood-rpc.publicnode.com',
      'https://robinhood.drpc.org',
    ]

export const EXPLORER = 'https://robinhoodchain.blockscout.com'
export const explorerTx = (hash) => `${EXPLORER}/tx/${hash}`
export const explorerAddress = (addr) => `${EXPLORER}/address/${addr}`
export const explorerToken = (contract, id) => `${EXPLORER}/token/${contract}/instance/${id}`

/** Robinhood Chain: an Arbitrum Orbit L2 with ETH gas, settling to Ethereum. */
export const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  caipNetworkId: `eip155:${ROBINHOOD_CHAIN_ID}`,
  chainNamespace: 'eip155',
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [ROBINHOOD_RPCS[0]] } },
  blockExplorers: { default: { name: 'Blockscout', url: EXPLORER } },
  // viem's multicall needs this declared for a custom chain, or every batched
  // read throws "does not support contract multicall3". The canonical
  // deployment is live on 4663 (checked 2026-10-13).
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
})
