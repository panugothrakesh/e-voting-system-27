'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@/store/useStore'
import { useQuery } from '@tanstack/react-query'

interface RegistrationStatus {
  isRegistered: boolean
  status: 'not_registered' | 'pending' | 'approved' | 'rejected'
}

interface Election {
  _id: string
  title: string
  description: string
  startDate: string
  endDate: string
  candidates: {
    name: string
    description: string
    votes: number
  }[]
  isActive: boolean
}

export default function RegistrationForm() {
  const { address } = useWallet()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    aadhar: '',
    phoneNumber: '',
    country: '',
    physicalAddress: ''
  })
  const [mounted, setMounted] = useState(false)
  const [showReapplyForm, setShowReapplyForm] = useState(false)

  const { data: status, isLoading, refetch } = useQuery<RegistrationStatus>({
    queryKey: ['voterStatus', address],
    queryFn: async () => {
      if (!address) return { isRegistered: false, status: 'not_registered' }
      const response = await fetch(`/api/voter/status?address=${address}`)
      const data = await response.json()
      return data
    },
    enabled: !!address
  })

  const { data: elections, isLoading: isLoadingElections } = useQuery<Election[]>({
    queryKey: ['activeElections'],
    queryFn: async () => {
      const response = await fetch('/api/elections/active')
      return response.json()
    },
    enabled: status?.status === 'approved'
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  // If user has any registration status (pending, approved, or rejected), show status message
  if (status?.status !== 'not_registered' && !showReapplyForm) {
    if (status?.status === 'pending') {
      return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Registration Pending</h2>
          <p className="text-gray-600">
            Your registration is under review. Please wait for admin approval.
          </p>
        </div>
      )
    }
    if (status?.status === 'approved') {
      return (
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Elections</h2>
          {isLoadingElections ? (
            <div className="text-center py-8">Loading elections...</div>
          ) : elections?.length === 0 ? (
            <p className="text-gray-600">No active elections at the moment.</p>
          ) : (
            <div className="space-y-6">
              {elections?.map((election) => (
                <div key={election._id} className="border rounded-lg p-4">
                  <h3 className="text-xl font-semibold mb-2">{election.title}</h3>
                  <p className="text-gray-600 mb-4">{election.description}</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Start Date</p>
                      <p>{new Date(election.startDate).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">End Date</p>
                      <p>{new Date(election.endDate).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">Candidates</h4>
                    {election.candidates.map((candidate, index) => (
                      <div key={index} className="border rounded p-3">
                        <h5 className="font-medium">{candidate.name}</h5>
                        <p className="text-gray-600">{candidate.description}</p>
                        <button
                          onClick={() => handleVote(election._id, index)}
                          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          Vote
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    if (status?.status === 'rejected') {
      return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Registration Rejected</h2>
          <p className="text-gray-600 mb-4">
            Your registration has been rejected. Please review your information and try again.
          </p>
          <button
            onClick={() => setShowReapplyForm(true)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Reapply
          </button>
        </div>
      )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) return

    try {
      const response = await fetch('/api/voter/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          ...formData
        }),
      })

      if (!response.ok) {
        throw new Error('Registration failed')
      }

      // Reset form and refetch status
      setFormData({
        firstName: '',
        lastName: '',
        aadhar: '',
        phoneNumber: '',
        country: '',
        physicalAddress: ''
      })
      setShowReapplyForm(false)
      refetch()
    } catch (error) {
      console.error('Registration error:', error)
    }
  }

  const handleVote = async (electionId: string, candidateIndex: number) => {
    if (!address) return

    try {
      const response = await fetch('/api/voter/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          electionId,
          candidateIndex,
          voterAddress: address
        }),
      })

      if (!response.ok) {
        throw new Error('Voting failed')
      }

      // Refresh elections data
      refetch()
    } catch (error) {
      console.error('Voting error:', error)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Voter Registration</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Number</label>
          <input
            type="text"
            value={formData.aadhar}
            onChange={(e) => setFormData({ ...formData, aadhar: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <input
            type="text"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Physical Address</label>
          <textarea
            value={formData.physicalAddress}
            onChange={(e) => setFormData({ ...formData, physicalAddress: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          {showReapplyForm ? 'Reapply for Registration' : 'Submit Registration'}
        </button>
      </form>
    </div>
  )
} 