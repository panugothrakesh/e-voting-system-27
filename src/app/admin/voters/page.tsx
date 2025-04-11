'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

interface Voter {
  _id: string
  encryptedAddress: string
  displayAddress: string
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
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: voters = [], isLoading, refetch } = useQuery<Voter[]>({
    queryKey: ['pendingVoters'],
    queryFn: async () => {
      const response = await fetch('/api/admin/voters')
      const data = await response.json()
      return Array.isArray(data) ? data : []
    }
  })

  const handleApprove = async (voter: Voter, action: 'approve' | 'reject') => {
    try {
      setIsProcessing(true)
      setError(null)
      
      const response = await fetch('/api/admin/voters/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          walletAddress: voter.encryptedAddress,
          action 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update voter status')
      }

      await refetch()
      setSelectedVoter(null)
    } catch (error) {
      console.error('Error updating voter status:', error)
      setError(error instanceof Error ? error.message : 'Failed to update voter status')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Voter Approvals</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {voters.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No voters found
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Encrypted Wallet Address
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
              {voters.map((voter) => (
                <tr key={voter._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {voter.firstName} {voter.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{voter.displayAddress}</div>
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
                          onClick={() => handleApprove(voter, 'approve')}
                          disabled={isProcessing}
                          className="text-green-600 hover:text-green-900 mr-4 disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleApprove(voter, 'reject')}
                          disabled={isProcessing}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing...' : 'Reject'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                <label className="block text-sm font-medium text-gray-700">Encrypted Wallet Address</label>
                <div className="mt-1 text-sm text-gray-900">{selectedVoter.displayAddress}</div>
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