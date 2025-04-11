import { createConfig, http } from 'wagmi'
import { sepolia } from 'viem/chains'
import { metaMask, walletConnect } from 'wagmi/connectors'

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
    [sepolia.id]: http()
  }
}) 