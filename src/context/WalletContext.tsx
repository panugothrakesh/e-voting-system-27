'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { metaMask } from 'wagmi/connectors'

interface WalletContextType {
  isConnected: boolean
  address: string | undefined
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  const handleConnect = async () => {
    try {
      await connect({
        connector: metaMask({
          dappMetadata: {
            name: 'E-Voting System',
            url: typeof window !== 'undefined' ? window.location.origin : '',
          },
        }),
      })
    } catch (err) {
      console.error('Failed to connect:', err)
    }
  }

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        connect: handleConnect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
} 