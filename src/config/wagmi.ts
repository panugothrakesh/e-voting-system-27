import { createConfig, http, fallback } from 'wagmi'
import { sepolia } from 'viem/chains'
import { metaMask, walletConnect } from 'wagmi/connectors'

// Use multiple RPC endpoints for better reliability
const RPC_URLS = {
  [sepolia.id]: [
    'https://eth-sepolia.public.blastapi.io',         // Primary: Public blast API
    'https://sepolia.gateway.tenderly.co',            // Fallback 1: Tenderly
    'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Fallback 2: Infura
    'https://rpc.sepolia.org',                        // Fallback 3: Public Sepolia
    'https://rpc2.sepolia.org'                        // Fallback 4: Public Sepolia 2
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
          retryCount: 5,                // Increase retry count
          timeout: 30_000,              // Increase timeout to 30 seconds
          batch: { batchSize: 1 }       // Disable batching to avoid issues
        })
      )
    )
  }
}) 