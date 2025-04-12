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

interface ElectionApproval {
  electionId: string
  status: 'approved' | 'rejected'
  contractAddress: string
  approvedAt?: string
  rejectedAt?: string
  isWhitelisted: boolean
  ethTxHash?: string
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
  electionApprovals?: ElectionApproval[]
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

  // Helper function to check if a voter is approved for a specific election
  const getVoterStatusForElection = (voter: Voter, electionId: string): 'pending' | 'approved' | 'rejected' => {
    if (!voter.electionApprovals || voter.electionApprovals.length === 0) {
      return 'pending'
    }
    
    const approval = voter.electionApprovals.find(a => a.electionId === electionId)
    return approval ? approval.status : 'pending'
  }

  const handleApproveForElection = async (voter: Voter, action: 'approve' | 'reject') => {
    try {
      console.log('Voter approval function called', { voter, action, electionId: selectedElection })
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
            : undefined,
          updateOverallStatus: true
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
      alert(`Voter ${action}ed successfully for the selected election!`)
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
                  Overall Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Selected Election Status
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    {selectedElection ? (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        getVoterStatusForElection(voter, selectedElection) === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        getVoterStatusForElection(voter, selectedElection) === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {getVoterStatusForElection(voter, selectedElection)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">No election selected</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => setSelectedVoter(voter)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      View Details
                    </button>
                    {selectedElection && (
                      <>
                        <button
                          onClick={() => handleApproveForElection(voter, 'approve')}
                          disabled={isProcessing || getVoterStatusForElection(voter, selectedElection) === 'approved'}
                          className={`bg-green-500 text-gray-900 font-bold px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed ${
                            getVoterStatusForElection(voter, selectedElection) === 'approved' ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={getVoterStatusForElection(voter, selectedElection) === 'approved' ? 'Already approved for this election' : ''}
                        >
                          {isProcessing ? 'Processing...' : '✅ APPROVE FOR ELECTION'}
                        </button>
                        <button
                          onClick={() => handleApproveForElection(voter, 'reject')}
                          disabled={isProcessing || getVoterStatusForElection(voter, selectedElection) === 'rejected'}
                          className={`bg-red-500 text-gray-900 font-bold px-4 py-2 rounded-md ml-2 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed ${
                            getVoterStatusForElection(voter, selectedElection) === 'rejected' ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={getVoterStatusForElection(voter, selectedElection) === 'rejected' ? 'Already rejected for this election' : ''}
                        >
                          {isProcessing ? 'Processing...' : '❌ REJECT FOR ELECTION'}
                        </button>
                      </>
                    )}
                    {!selectedElection && (
                      <span className="text-amber-500 font-semibold">Please select an election first</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Voter details modal */}
      {selectedVoter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl overflow-auto max-h-screen">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Voter Details</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="text-gray-900">{selectedVoter.firstName} {selectedVoter.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="text-gray-900">{selectedVoter.phoneNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Country</p>
                      <p className="text-gray-900">{selectedVoter.country}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Physical Address</p>
                      <p className="text-gray-900">{selectedVoter.physicalAddress}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Blockchain Information</h3>
                  <div>
                    <p className="text-sm text-gray-500">Wallet Address (Encrypted)</p>
                    <p className="text-gray-900 break-all">{selectedVoter.encryptedAddress}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Election Approvals</h3>
                  {selectedVoter.electionApprovals && selectedVoter.electionApprovals.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Election</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedVoter.electionApprovals.map((approval) => {
                          const election = elections.find(e => e._id === approval.electionId);
                          return (
                            <tr key={approval.electionId}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {election ? election.title : 'Unknown Election'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  approval.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {approval.status}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {approval.approvedAt ? new Date(approval.approvedAt).toLocaleDateString() : 
                                 approval.rejectedAt ? new Date(approval.rejectedAt).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500">No election approvals yet</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedVoter(null)}
                  className="bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}