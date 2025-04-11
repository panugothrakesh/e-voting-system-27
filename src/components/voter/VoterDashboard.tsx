'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { useQuery } from '@tanstack/react-query'

interface VoterStatus {
  isWhitelisted: boolean
  hasVoted: boolean
}

interface Election {
  _id: string
  title: string
  description: string
  candidates: {
    name: string
    description: string
    votes: number
  }[]
  endDate: string
}

export default function VoterDashboard() {
  const { address } = useStore()
  const [selectedCandidate, setSelectedCandidate] = useState<string>('')
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  // Refresh data periodically
  useEffect(() => {
    const timer = setInterval(() => {
      console.log('Refreshing voter elections data')
      setLastRefresh(Date.now())
    }, 5000) // Refresh every 5 seconds
    
    return () => clearInterval(timer)
  }, [])

  const { data: voterStatus, isLoading: isStatusLoading } = useQuery<VoterStatus>({
    queryKey: ['voterStatus', address, lastRefresh],
    queryFn: async () => {
      const response = await fetch(`/api/voter/status?address=${address}`)
      return response.json()
    },
    enabled: !!address
  })

  const { data: elections, isLoading: isElectionsLoading } = useQuery<Election[]>({
    queryKey: ['voterElections', address, lastRefresh],
    queryFn: async () => {
      if (!address) return []
      console.log('Fetching voter elections', { address, timestamp: new Date().toISOString() })
      const response = await fetch(`/api/voter/elections?address=${address}`)
      const data = await response.json()
      console.log('Elections response:', data)
      return Array.isArray(data) ? data : []
    },
    enabled: !!address && !!voterStatus?.isWhitelisted
  })

  const handleVote = async (electionId: string) => {
    if (!selectedCandidate) return

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          electionId,
          candidateName: selectedCandidate,
          voterAddress: address,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to cast vote')
      }

      // Refresh data
      window.location.reload()
    } catch (error) {
      console.error('Error casting vote:', error)
    }
  }

  if (isStatusLoading || isElectionsLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (!voterStatus?.isWhitelisted) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">You are not whitelisted to vote.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Active Elections</h2>
      
      {elections?.map((election) => (
        <div key={election._id} className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-2">{election.title}</h3>
          <p className="text-gray-800 mb-4">{election.description}</p>
          
          <div className="space-y-4">
            {election.candidates.map((candidate) => (
              <div key={candidate.name} className="flex items-center space-x-4">
                <input
                  type="radio"
                  id={candidate.name}
                  name={`candidate-${election._id}`}
                  value={candidate.name}
                  checked={selectedCandidate === candidate.name}
                  onChange={(e) => setSelectedCandidate(e.target.value)}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor={candidate.name} className="flex-1">
                  <div className="font-medium">{candidate.name}</div>
                  <div className="text-sm text-gray-700">{candidate.description}</div>
                </label>
                <div className="text-sm text-gray-700">Votes: {candidate.votes}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => handleVote(election._id)}
            disabled={!selectedCandidate}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Cast Vote
          </button>
        </div>
      ))}

      {elections?.length === 0 && (
        <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <p className="text-yellow-800 mb-2 font-semibold">No Elections Available</p>
          <p className="text-gray-700">You haven&apos;t been approved for any active elections yet, or there are no active elections at this time.</p>
          <p className="text-gray-600 mt-2 text-sm">Please contact the election administrator if you believe this is an error.</p>
        </div>
      )}
    </div>
  )
} 