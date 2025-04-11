import { createConfig, http, fallback } from 'wagmi'
import { sepolia } from 'viem/chains'
import { metaMask, walletConnect } from 'wagmi/connectors'

// Use multiple RPC endpoints for better reliability
const RPC_URLS = {
  [sepolia.id]: [
    'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Primary: Infura
    'https://eth-sepolia.public.blastapi.io', // Fallback 1
    'https://rpc.sepolia.org' // Fallback 2
  ]
}

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'E-Voting System',
        url: typeof window !== 'undefined' ? window.location.origin : '',
      },
    }),
    walletConnect({
      projectId: '7595f3df8e594ba97ebcb7c487875592',
    }),
  ],
  transports: {
    [sepolia.id]: fallback(
      RPC_URLS[sepolia.id].map(url => 
        http(url, {
          retryCount: 3,
          timeout: 15_000,
          batch: true
        })
      )
    )
  }
}) 