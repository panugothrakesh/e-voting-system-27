'use client'

import { useState } from 'react'

interface Election {
  id: number
  name: string
  status: 'active' | 'ended' | 'upcoming'
  startDate: string
  endDate: string
  totalVotes: number
}

export default function ManageElections() {
  const [showNewElectionModal, setShowNewElectionModal] = useState(false)
  const [elections] = useState<Election[]>([
    {
      id: 1,
      name: 'City Council Election 2024',
      status: 'active',
      startDate: '2024-03-01',
      endDate: '2024-03-15',
      totalVotes: 750,
    },
    {
      id: 2,
      name: 'State Assembly Election',
      status: 'upcoming',
      startDate: '2024-04-01',
      endDate: '2024-04-15',
      totalVotes: 0,
    },
    {
      id: 3,
      name: 'Local School Board',
      status: 'ended',
      startDate: '2024-02-01',
      endDate: '2024-02-15',
      totalVotes: 1200,
    },
  ])

  const [newElection, setNewElection] = useState({
    name: '',
    startDate: '',
    endDate: '',
  })

  const handleCreateElection = (e: React.FormEvent) => {
    e.preventDefault()
    // This will be replaced with actual contract interaction
    console.log('Creating election:', newElection)
    setShowNewElectionModal(false)
  }

  const handleEndElection = (id: number) => {
    // This will be replaced with actual contract interaction
    console.log('Ending election:', id)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Manage Elections</h1>
        <button
          onClick={() => setShowNewElectionModal(true)}
          className="bg-blue-600 text-gray-900 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create New Election
        </button>
      </div>

      {/* Elections List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Election Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Votes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {elections.map((election) => (
              <tr key={election.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{election.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    election.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : election.status === 'upcoming'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {election.startDate} to {election.endDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {election.totalVotes}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {election.status === 'active' && (
                    <button
                      onClick={() => handleEndElection(election.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      End Election
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Election Modal */}
      {showNewElectionModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Election</h2>
            <form onSubmit={handleCreateElection} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Election Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={newElection.name}
                  onChange={(e) => setNewElection({ ...newElection, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-700"
                  required
                />
              </div>
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={newElection.startDate}
                  onChange={(e) => setNewElection({ ...newElection, startDate: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-700"
                  required
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={newElection.endDate}
                  onChange={(e) => setNewElection({ ...newElection, endDate: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-700"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewElectionModal(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Election
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 