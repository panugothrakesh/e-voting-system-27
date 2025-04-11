'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { whitelistVoters } from '@/utils/contract'
import { decryptAddress } from '@/utils/crypto'

interface Election {
  _id: string
  title: string
  description: string
  contractAddress: string
  isActive: boolean
}

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
  const [selectedElection, setSelectedElection] = useState<string>('')

  // Fetch active elections
  const { data: elections = [] } = useQuery<Election[]>({
    queryKey: ['activeElections'],
    queryFn: async () => {
      const response = await fetch('/api/admin/elections')
      const data = await response.json()
      return Array.isArray(data) ? data : []
    }
  })

  const { data: voters = [], isLoading, refetch } = useQuery<Voter[]>({
    queryKey: ['pendingVoters'],
    queryFn: async () => {
      const response = await fetch('/api/admin/voters')
      const data = await response.json()
      return Array.isArray(data) ? data : []
    }
  })

  const handleApproveSimple = async (voter: Voter, action: 'approve' | 'reject') => {
    try {
      console.log('Voter approval function called', { voter, action })
      setIsProcessing(true)
      setError(null)
      
      // For approval, handle the blockchain interaction first
      if (action === 'approve') {
        // Check if election is selected
        if (!selectedElection) {
          setError('Please select an election to whitelist the voter')
          throw new Error('Please select an election to whitelist the voter')
        }
        
        // Find election object
        const electionObj = elections.find(e => e._id === selectedElection)
        if (!electionObj || !electionObj.contractAddress) {
          setError('Selected election not found or has no contract address')
          throw new Error('Selected election not found or has no contract address')
        }
        
        try {
          // Decrypt the voter's address
          const decryptedAddress = decryptAddress(voter.encryptedAddress)
          console.log('Decrypted address:', decryptedAddress)
          
          if (!decryptedAddress || !decryptedAddress.startsWith('0x')) {
            throw new Error('Failed to decrypt voter wallet address or invalid address format')
          }
          
          // Call the smart contract to whitelist the voter
          console.log('Whitelisting voter on contract:', {
            contractAddress: electionObj.contractAddress,
            voterAddress: decryptedAddress
          })
          
          // This will trigger the MetaMask popup
          const result = await whitelistVoters(
            electionObj.contractAddress as `0x${string}`, 
            [decryptedAddress as `0x${string}`]
          )
          
          console.log('Contract interaction successful:', result)
        } catch (contractError) {
          console.error('Contract interaction failed:', contractError)
          setError('Contract interaction failed: ' + (contractError instanceof Error ? contractError.message : String(contractError)))
          throw new Error('Contract interaction failed')
        }
      }
      
      // After successful contract interaction (or for reject), update the database
      const response = await fetch('/api/admin/voters/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          walletAddress: voter.encryptedAddress,
          action,
          electionId: selectedElection || undefined,
          electionContractAddress: selectedElection 
            ? elections.find(e => e._id === selectedElection)?.contractAddress 
            : undefined
        }),
      })

      console.log('API response status:', response.status)
      const data = await response.json()
      console.log('API response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update voter status')
      }

      await refetch()
      setSelectedVoter(null)
      alert(`Voter ${action}ed successfully!`)
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

      {/* Election Selector */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <label htmlFor="election" className="block text-lg font-medium text-blue-700 mb-2">
          Step 1: Select Election for Whitelisting
        </label>
        <select
          id="election"
          value={selectedElection}
          onChange={(e) => {
            console.log('Election selected:', e.target.value);
            setSelectedElection(e.target.value);
          }}
          className="block w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select an election</option>
          {elections.map((election) => (
            <option key={election._id} value={election._id}>
              {election.title} {election.isActive ? '(Active)' : '(Inactive)'} - Contract: {election.contractAddress ? election.contractAddress.substring(0, 8) + '...' : 'No address'}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-blue-600 font-semibold">
          You must select an election before you can approve voters. Approving a voter will whitelist them on the blockchain and require a wallet transaction.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Elections loaded: {elections.length} {elections.length === 0 && '(No elections available, please create one first)'}
        </p>
      </div>

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
                          onClick={() => {
                            console.log("APPROVE BUTTON CLICKED - Using simple function", voter.firstName);
                            handleApproveSimple(voter, 'approve');
                          }}
                          className="bg-green-500 text-white font-bold px-4 py-2 rounded-md hover:bg-green-600"
                        >
                          ✅ APPROVE & WHITELIST
                        </button>
                        <button
                          onClick={() => handleApproveSimple(voter, 'reject')}
                          disabled={isProcessing}
                          className="bg-red-500 text-white font-bold px-4 py-2 rounded-md ml-2 hover:bg-red-600 disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing...' : '❌ REJECT'}
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