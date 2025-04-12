'use client'

import { useWallet } from '@/store/useStore'
import { shortenAddress } from '@/utils/format'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const { address, isConnected, isAdmin, connect, disconnect } = useWallet()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const handleDisconnect = () => {
    disconnect()
  }

  return (
    <nav className="bg-white shadow">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="text-xl font-bold text-gray-900">
            E-Voting System
          </div>
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <>
                <span className="text-sm text-gray-700">
                  {address && shortenAddress(address)}
                </span>
                {isAdmin && (
                  <span className="text-sm text-gray-700">(Admin)</span>
                )}
                <button
                  onClick={handleDisconnect}
                  className="bg-red-500 text-gray-900 px-3 py-1 rounded-lg text-sm hover:bg-red-600 transition-colors"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={connect}
                className="bg-blue-600 text-gray-900 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}