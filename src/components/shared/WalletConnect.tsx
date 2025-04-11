'use client'

import { useWallet } from '@/context/WalletContext'

export default function WalletConnect() {
  const { isConnected, address, connect, disconnect } = useWallet()

  const shortenAddress = (addr: string | undefined) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="flex items-center">
      {isConnected ? (
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">{shortenAddress(address)}</span>
          <button
            onClick={() => disconnect()}
            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          Connect Wallet
        </button>
      )}
    </div>
  )
} 