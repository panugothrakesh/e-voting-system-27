'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

interface Voter {
  _id: string
  walletAddress: string
  firstName: string
  lastName: string
  aadhar: string
  phoneNumber: string
  country: string
  physicalAddress: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export default function VoterApprovalPage() {
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null)

  const { data: voters, isLoading, refetch } = useQuery<Voter[]>({
    queryKey: ['pendingVoters'],
    queryFn: async () => {
      const response = await fetch('/api/admin/voters')
      return response.json()
    }
  })

  const handleApprove = async (walletAddress: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/admin/voters/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress, action }),
      })

      if (!response.ok) {
        throw new Error('Failed to update voter status')
      }

      refetch()
      setSelectedVoter(null)
    } catch (error) {
      console.error('Error updating voter status:', error)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Voter Approvals</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Wallet Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {voters?.map((voter) => (
              <tr key={voter._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {voter.firstName} {voter.lastName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{voter.walletAddress}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    voter.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    voter.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {voter.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => setSelectedVoter(voter)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    View Details
                  </button>
                  {voter.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(voter.walletAddress, 'approve')}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApprove(voter.walletAddress, 'reject')}
                        className="text-red-600 hover:text-red-900"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedVoter && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Voter Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <div className="mt-1 text-sm text-gray-900">
                  {selectedVoter.firstName} {selectedVoter.lastName}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Aadhar Number</label>
                <div className="mt-1 text-sm text-gray-900">{selectedVoter.aadhar}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <div className="mt-1 text-sm text-gray-900">{selectedVoter.phoneNumber}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <div className="mt-1 text-sm text-gray-900">{selectedVoter.country}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Physical Address</label>
                <div className="mt-1 text-sm text-gray-900">{selectedVoter.physicalAddress}</div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedVoter(null)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 