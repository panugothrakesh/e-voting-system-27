'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useWallet } from '@/store/useStore'
import {
  ChartBarIcon,
  UserGroupIcon,
  UserPlusIcon,
  ClipboardDocumentListIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: ChartBarIcon },
  { name: 'Manage Elections', href: '/admin/elections', icon: ClipboardDocumentListIcon },
  { name: 'Candidates', href: '/admin/candidates', icon: UserGroupIcon },
  { name: 'Approve Voters', href: '/admin/voters', icon: UserPlusIcon },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { address, isConnected, isAdmin, disconnect } = useWallet()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      // Add a small delay to allow the connection state to be determined
      const timer = setTimeout(() => {
        setIsLoading(false)
        if (!isConnected) {
          router.push('/')
          return
        }
        if (!isAdmin) {
          router.push('/')
        }
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [mounted, isConnected, isAdmin, router])

  const handleDisconnect = () => {
    localStorage.clear()
    disconnect()
  }

  const shortenAddress = (addr: string | undefined) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isConnected || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform ${
        sidebarOpen ? 'w-64' : 'w-20'
      } transition-all duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b">
            {sidebarOpen ? (
              <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
            ) : (
              <h1 className="text-xl font-bold text-gray-800">AP</h1>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-500 hover:text-gray-600"
            >
              {sidebarOpen ? (
                <ChevronLeftIcon className="w-6 h-6" />
              ) : (
                <ChevronRightIcon className="w-6 h-6" />
              )}
            </button>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`mr-3 h-6 w-6 ${
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  {sidebarOpen && <span>{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          {isConnected && (
            <div className="p-4 border-t">
              <div className="flex items-center justify-between">
                {sidebarOpen ? (
                  <>
                    <span className="text-sm text-gray-600">{shortenAddress(address)}</span>
                    <button
                      onClick={handleDisconnect}
                      className="bg-red-500 text-gray-900 px-3 py-1 rounded-lg text-sm hover:bg-red-600 transition-colors"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-xs text-gray-600">{shortenAddress(address)}</span>
                    <button
                      onClick={handleDisconnect}
                      className="bg-red-500 text-gray-900 p-1 rounded-lg text-xs hover:bg-red-600 transition-colors"
                    >
                      DC
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className={`${sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'} flex flex-col flex-1 min-h-screen transition-all duration-300`}>
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
} 