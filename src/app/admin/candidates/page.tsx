'use client'

import { useState } from 'react'

interface Candidate {
  id: number
  name: string
  party: string
  electionId: number
  electionName: string
  votes: number
}

export default function ManageCandidates() {
  const [showNewCandidateModal, setShowNewCandidateModal] = useState(false)
  const [candidates] = useState<Candidate[]>([
    {
      id: 1,
      name: 'John Doe',
      party: 'Party A',
      electionId: 1,
      electionName: 'City Council Election 2024',
      votes: 150,
    },
    {
      id: 2,
      name: 'Jane Smith',
      party: 'Party B',
      electionId: 1,
      electionName: 'City Council Election 2024',
      votes: 120,
    },
    {
      id: 3,
      name: 'Bob Johnson',
      party: 'Party C',
      electionId: 2,
      electionName: 'State Assembly Election',
      votes: 0,
    },
  ])

  const [newCandidate, setNewCandidate] = useState({
    name: '',
    party: '',
    electionId: '',
  })

  const elections = [
    { id: 1, name: 'City Council Election 2024' },
    { id: 2, name: 'State Assembly Election' },
  ]

  const handleCreateCandidate = (e: React.FormEvent) => {
    e.preventDefault()
    // This will be replaced with actual contract interaction
    console.log('Creating candidate:', newCandidate)
    setShowNewCandidateModal(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Manage Candidates</h1>
        <button
          onClick={() => setShowNewCandidateModal(true)}
          className="bg-blue-600 text-gray-900 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add New Candidate
        </button>
      </div>

      {/* Candidates List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Candidate Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Party
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Election
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Votes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {candidates.map((candidate) => (
              <tr key={candidate.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{candidate.party}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{candidate.electionName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {candidate.votes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Candidate Modal */}
      {showNewCandidateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Candidate</h2>
            <form onSubmit={handleCreateCandidate} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Candidate Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={newCandidate.name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-700"
                  required
                />
              </div>
              <div>
                <label htmlFor="party" className="block text-sm font-medium text-gray-700">
                  Party
                </label>
                <input
                  type="text"
                  id="party"
                  value={newCandidate.party}
                  onChange={(e) => setNewCandidate({ ...newCandidate, party: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-700"
                  required
                />
              </div>
              <div>
                <label htmlFor="election" className="block text-sm font-medium text-gray-700">
                  Election
                </label>
                <select
                  id="election"
                  value={newCandidate.electionId}
                  onChange={(e) => setNewCandidate({ ...newCandidate, electionId: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-700"
                  required
                >
                  <option value="">Select an election</option>
                  {elections.map((election) => (
                    <option key={election.id} value={election.id}>
                      {election.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewCandidateModal(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-gray-900 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 