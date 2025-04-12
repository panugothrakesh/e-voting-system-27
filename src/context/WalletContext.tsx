'use client'

import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { metaMask } from 'wagmi/connectors'

// Create context
interface WalletContextType {
  address?: string
  isConnected: boolean
  isAdmin: boolean
  connect: () => Promise<void>
  disconnect: () => void
  error: string | null
}

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  isAdmin: false,
  connect: async () => {},
  disconnect: () => {},
  error: null
})

// Admin addresses (hardcoded for simplicity)
const ADMIN_ADDRESSES = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'.toLowerCase()
]

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()
  const { connectAsync } = useConnect()
  const { disconnectAsync } = useDisconnect()
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check if address is an admin
  useEffect(() => {
    if (address) {
      const isAdminAddress = ADMIN_ADDRESSES.includes(address.toLowerCase())
      setIsAdmin(isAdminAddress)
      
      // Store admin status in localStorage for persistence
      if (isAdminAddress) {
        localStorage.setItem('isAdmin', 'true')
      }
    } else {
      setIsAdmin(false)
    }
  }, [address])

  // Connect wallet
  const connect = async () => {
    try {
      setError(null)
      
      // Check if MetaMask is installed
      if (typeof window !== 'undefined' && !window.ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask to continue.')
      }
      
      await connectAsync({ 
        connector: metaMask({
          dappMetadata: {
            name: 'E-Voting System',
            url: typeof window !== 'undefined' ? window.location.origin : '',
          }
        })
      })
    } catch (e) {
      console.error('Connection error:', e)
      if (e instanceof Error) {
        // Handle specific error types
        if (e.message.includes('User rejected')) {
          setError('Connection rejected. Please try again.')
        } else if (e.message.includes('chain')) {
          setError('Please connect to the Sepolia testnet.')  
        } else {
          setError(e.message)
        }
      } else {
        setError('Failed to connect. Please try again.')
      }
    }
  }

  // Disconnect wallet
  const disconnect = async () => {
    try {
      await disconnectAsync()
      localStorage.removeItem('isAdmin')
    } catch (e) {
      console.error('Disconnect error:', e)
    }
  }

  return (
    <WalletContext.Provider value={{ 
      address,
      isConnected,
      isAdmin,
      connect,
      disconnect,
      error
    }}>
      {children}
    </WalletContext.Provider>
  )
}

// Custom hook to use wallet context
export function useWallet() {
  return useContext(WalletContext)
} 