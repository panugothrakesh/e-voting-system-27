'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

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
  createdAt: string
}

export default function AdminDashboard() {
  const [newElection, setNewElection] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    candidates: [{ name: '', description: '' }]
  })

  const { data: elections, isLoading, refetch } = useQuery<Election[]>({
    queryKey: ['adminElections'],
    queryFn: async () => {
      const response = await fetch('/api/admin/elections')
      return response.json()
    }
  })

  const handleAddCandidate = () => {
    setNewElection(prev => ({
      ...prev,
      candidates: [...prev.candidates, { name: '', description: '' }]
    }))
  }

  const handleCandidateChange = (index: number, field: string, value: string) => {
    setNewElection(prev => ({
      ...prev,
      candidates: prev.candidates.map((candidate, i) => 
        i === index ? { ...candidate, [field]: value } : candidate
      )
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/admin/elections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newElection),
      })

      if (!response.ok) {
        throw new Error('Failed to create election')
      }

      // Reset form and refresh data
      setNewElection({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        candidates: [{ name: '', description: '' }]
      })
      refetch()
    } catch (error) {
      console.error('Error creating election:', error)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="datetime-local"
                  value={newElection.startDate}
                  onChange={(e) => setNewElection(prev => ({ ...prev, startDate: e.target.value }))}
                  className="mt-1 block w-full rounded-md text-gray-700 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="datetime-local"
                  value={newElection.endDate}
                  onChange={(e) => setNewElection(prev => ({ ...prev, endDate: e.target.value }))}
                  className="mt-1 block w-full rounded-md text-gray-700 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Candidates</label>
              {newElection.candidates.map((candidate, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 mb-2">
                  <input
                    type="text"
                    placeholder="Candidate Name"
                    value={candidate.name}
                    onChange={(e) => handleCandidateChange(index, 'name', e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Candidate Description"
                    value={candidate.description}
                    onChange={(e) => handleCandidateChange(index, 'description', e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddCandidate}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Candidate
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create Election
            </button>
          </form>
        </div>

        {/* Elections List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">Active Elections</h2>
          {elections?.map((election) => (
            <div key={election._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{election.title}</h3>
                  <p className="text-gray-800">{election.description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  election.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {election.isActive ? 'Active' : 'Ended'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-700">Start Date</p>
                  <p className="text-gray-900">{new Date(election.startDate).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-700">End Date</p>
                  <p className="text-gray-900">{new Date(election.endDate).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Candidates</h4>
                {election.candidates.map((candidate, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-900">{candidate.name}</p>
                      <p className="text-sm text-gray-700">{candidate.description}</p>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">{candidate.votes} votes</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 