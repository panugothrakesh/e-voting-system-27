'use client'

import { create } from 'zustand'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { useEffect } from 'react'

interface StoreState {
  address: string | undefined
  isConnected: boolean
  isAdmin: boolean
}

const useStore = create<StoreState>(() => ({
  address: undefined,
  isConnected: false,
  isAdmin: false,
}))

// Custom hook to handle wallet connection
export function useWallet() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    if (address && isConnected) {
      useStore.setState({
        address,
        isConnected,
        isAdmin: address.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase(),
      })
    } else {
      useStore.setState({
        address: undefined,
        isConnected: false,
        isAdmin: false,
      })
    }
  }, [address, isConnected])

  const handleConnect = () => {
    connect({ connector: injected() })
  }

  return {
    address,
    isConnected,
    isAdmin: address?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase(),
    connect: handleConnect,
    disconnect,
  }
}

export { useStore } 