'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { createElection, registerCandidate } from '@/utils/contract'
import { useWallet } from '@/store/useStore'
import { BaseError } from 'viem'

interface Election {
  _id: string
  title: string
  description: string
  contractAddress: string
  startDate: string
  endDate: string
  candidates: {
    name: string
    address: string
    votes: number
  }[]
  isActive: boolean
  createdAt: string
}

export default function AdminDashboard() {
  const { address, isConnected } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedElection, setSelectedElection] = useState<Election | null>(null)
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    address: ''
  })

  const [newElection, setNewElection] = useState({
    title: '',
    description: ''
  })

  const { data: elections, refetch } = useQuery<Election[]>({
    queryKey: ['adminElections'],
    queryFn: async () => {
      const response = await fetch('/api/admin/elections')
      return response.json()
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    if (!isConnected || !address) {
      setError('Please connect your wallet first')
      setIsLoading(false)
      return
    }

    try {
      // Create the election in the smart contract
      console.log('Creating election:', { electionName: newElection.title, electionDescription: newElection.description })
      const contractAddress = await createElection(
        newElection.title,
        newElection.description
      )
      console.log('Smart contract result:', contractAddress)

      // Validate contract address
      if (!contractAddress.startsWith('0x') || contractAddress.length !== 42) {
        throw new Error('Invalid contract address received from smart contract')
      }

      // Then save to MongoDB with the contract address
      const response = await fetch('/api/admin/elections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newElection,
          contractAddress: contractAddress
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create election')
      }

      // Reset form and refresh data
      setNewElection({
        title: '',
        description: ''
      })
      refetch()
    } catch (error) {
      console.error('Error creating election:', error)
      if (error instanceof BaseError) {
        setError(`Contract error: ${error.shortMessage}`)
      } else if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedElection || !address) return

    setIsLoading(true)
    setError(null)

    try {
      // Validate Ethereum address
      if (!newCandidate.address.startsWith('0x') || newCandidate.address.length !== 42) {
        throw new Error('Please enter a valid Ethereum address (should start with 0x and be 42 characters long)')
      }

      console.log('Adding candidate to election:', selectedElection._id)
      console.log('Candidate details:', newCandidate)

      // First, register the candidate in the smart contract
      console.log('Selected Election:', selectedElection)
      
      const contractResult = await registerCandidate(
        selectedElection.contractAddress as `0x${string}`, // The deployed contract address
        newCandidate.address as `0x${string}`, // The candidate's address from input
        newCandidate.name // The candidate's name from input
      )

      console.log('Contract registration result:', contractResult)

      // Then save to MongoDB
      const response = await fetch(`/api/admin/elections/${selectedElection._id}/candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCandidate.name,
          address: newCandidate.address,
          walletAddress: address
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Server error response:', data)
        throw new Error(data.error || data.details || 'Failed to add candidate')
      }

      setNewCandidate({
        name: '',
        address: ''
      })
      refetch()
    } catch (error) {
      console.error('Error adding candidate:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Create Election Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Create New Election</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={newElection.title}
                onChange={(e) => setNewElection(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 block w-full rounded-md text-gray-700 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newElection.description}
                onChange={(e) => setNewElection(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full rounded-md text-gray-700 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Election'}
            </button>
          </form>
        </div>

        {/* Add Candidate Form */}
        {selectedElection && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Add Candidate to {selectedElection.title}</h2>
            <form onSubmit={handleAddCandidate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Candidate Name</label>
                <input
                  type="text"
                  value={newCandidate.name}
                  onChange={(e) => setNewCandidate(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md text-gray-700 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Candidate Address</label>
                <input
                  type="text"
                  value={newCandidate.address}
                  onChange={(e) => setNewCandidate(prev => ({ ...prev, address: e.target.value }))}
                  className="mt-1 block w-full rounded-md text-gray-700 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Adding...' : 'Add Candidate'}
              </button>
            </form>
          </div>
        )}

        {/* Elections List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">Active Elections</h2>
          {elections?.map((election) => (
            <div key={election._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{election.title}</h3>
                  <p className="text-gray-800">{election.description}</p>
                  <p className="text-sm text-gray-500 mt-2">Contract: {election.contractAddress}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedElection(election)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Candidate
                  </button>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    election.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {election.isActive ? 'Active' : 'Ended'}
                  </span>
                </div>
              </div>

              {election.candidates.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Candidates</h4>
                  <div className="space-y-2">
                    {election.candidates.map((candidate, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-gray-900">{candidate.name}</p>
                          <p className="text-sm text-gray-500">{candidate.address}</p>
                        </div>
                        <span className="text-lg font-semibold text-gray-900">{candidate.votes} votes</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 