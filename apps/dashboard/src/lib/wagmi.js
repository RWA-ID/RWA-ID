import { createAppKit } from '@reown/appkit'
import { mainnet } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { http } from 'viem'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

const metadata = {
  name: 'RWA-ID Dashboard',
  description: 'Project owner dashboard for RWA-ID',
  url: 'https://dashboard.rwa-id.com',
  icons: ['https://dashboard.rwa-id.com/favicon.svg'],
}

// Use public RPCs directly for all read calls — WalletConnect's RPC proxy
// blocks eth_getLogs. Wallet signing still goes through WalletConnect normally.
const PUBLIC_TRANSPORT = http('https://ethereum.publicnode.com')

export const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet],
  projectId,
  transports: {
    1: PUBLIC_TRANSPORT, // mainnet chainId = 1
  },
})

export const config = wagmiAdapter.wagmiConfig

export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet],
  projectId,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
})
