'use client'

import { useState } from 'react'
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

  const { data: voterStatus, isLoading: isStatusLoading } = useQuery<VoterStatus>({
    queryKey: ['voterStatus', address],
    queryFn: async () => {
      const response = await fetch(`/api/voter/status?address=${address}`)
      return response.json()
    },
    enabled: !!address
  })

  const { data: elections, isLoading: isElectionsLoading } = useQuery<Election[]>({
    queryKey: ['activeElections'],
    queryFn: async () => {
      const response = await fetch('/api/elections/active')
      return response.json()
    }
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
        <p className="text-center text-gray-700">No active elections at the moment.</p>
      )}
    </div>
  )
} 