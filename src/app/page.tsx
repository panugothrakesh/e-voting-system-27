'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import VoterDashboard from '@/components/voter/VoterDashboard'
import RegistrationForm from '@/components/voter/RegistrationForm'
import Navbar from '@/components/shared/Navbar'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [isWhitelisted, setIsWhitelisted] = useState(false)
  const { address, isConnected, isAdmin } = useStore()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check admin status and whitelist status when address changes
  useEffect(() => {
    if (address) {
      if (isAdmin) {
        router.push('/admin')
        return
      }
      // This will be replaced with actual contract interaction
      setIsWhitelisted(false)
    }
  }, [address, isAdmin, router])

  if (!mounted) {
    return null
  }

  // If admin, don't render anything (will be redirected)
  if (address && isAdmin) {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-700">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {isConnected ? (
          isWhitelisted ? (
            <VoterDashboard />
          ) : (
            <RegistrationForm />
          )
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to E-Voting System
            </h2>
            <p className="text-gray-700 mb-8">
              Please connect your wallet to continue
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
