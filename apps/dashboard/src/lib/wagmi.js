import { createAppKit } from '@reown/appkit'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { fallback, http } from 'viem'
import { robinhoodChain, ROBINHOOD_CHAIN_ID, ROBINHOOD_RPCS } from './chain'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

const metadata = {
  name: 'RWA ID',
  description: 'Readable ENS identities for tokenized real-world-asset platforms, on Robinhood Chain.',
  url: 'https://rwa-id.com',
  // A square PNG: wallets commonly refuse to draw an SVG dapp icon in the signing prompt.
  icons: ['https://rwa-id.com/icon-512.png'],
}

export const wagmiAdapter = new WagmiAdapter({
  networks: [robinhoodChain],
  projectId,
  transports: {
    [ROBINHOOD_CHAIN_ID]: fallback(ROBINHOOD_RPCS.map(url => http(url))),
  },
})

export const config = wagmiAdapter.wagmiConfig

export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: [robinhoodChain],
  defaultNetwork: robinhoodChain,
  projectId,
  metadata,
  // Robinhood Wallet, then MetaMask (WalletConnect explorer ids).
  featuredWalletIds: [
    '8837dd9413b1d9b585ee937d27a816590248386d9dbf099aff5048f435ef347b',
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
  ],
  themeMode: 'light',
  themeVariables: {
    '--apkt-accent': '#0B0C0A',
    '--apkt-border-radius-master': '4px',
    '--apkt-color-mix-strength': 0,
  },
  features: {
    analytics: false,
    // Embedded (email/social) wallets cannot reliably sign on chain 4663 — see
    // the HoodFi notes on Reown #5764/#5765. These are only the fallback; the
    // Reown dashboard setting wins whenever its config fetch succeeds.
    email: false,
    socials: false,
    onramp: false,
    swaps: false,
  },
})
