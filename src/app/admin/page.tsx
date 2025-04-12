'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { createElection, registerCandidate, getVotesByAddress, getFactoryContract, getAllCandidates } from '@/utils/contract'
import { useWallet } from '@/store/useStore'
import { BaseError } from 'viem'
import { config } from '@/config/wagmi'

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

  // Add a new loading state for refreshing votes
  const [refreshingVotes, setRefreshingVotes] = useState<Record<string, boolean>>({})

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

  // Add a function to refresh a candidate's votes
  const refreshCandidateVotes = async (election: Election, candidate: { name: string, address: string, votes: number }, index: number) => {
    if (!election.contractAddress) {
      alert(`Election ${election.title} has no contract address`);
      return;
    }
    
    if (!candidate.address) {
      alert(`Candidate ${candidate.name} has no address`);
      return;
    }
    
    // Validate candidate address format
    if (!candidate.address.startsWith('0x') || candidate.address.length !== 42) {
      alert(`Invalid candidate address format: ${candidate.address}`);
      return;
    }
    
    // Validate contract address format
    if (!election.contractAddress.startsWith('0x') || election.contractAddress.length !== 42) {
      alert(`Invalid contract address format: ${election.contractAddress}`);
      return;
    }
    
    const candidateKey = `${election._id}_${index}`;
    
    // Set loading state for this candidate
    setRefreshingVotes(prev => ({ ...prev, [candidateKey]: true }));
    
    try {
      console.log(`Refreshing votes for ${candidate.name} in ${election.title}`);
      console.log(`Contract address: ${election.contractAddress}`);
      console.log(`Candidate address: ${candidate.address}`);
      
      // Format the candidate address as a proper Ethereum address
      const formattedCandidateAddress = candidate.address as `0x${string}`;
      const contractAddress = election.contractAddress as `0x${string}`;
      
      // First, get all candidates to check if this candidate exists in the contract
      console.log('Getting all candidates from contract first to verify candidate exists...');
      
      try {
        const allCandidates = await getAllCandidates(contractAddress);
        console.log('All candidates in contract:', allCandidates);
        
        // Check if the candidate exists in the contract
        const candidateExists = allCandidates.some(
          c => c.address.toLowerCase() === formattedCandidateAddress.toLowerCase()
        );
        
        if (!candidateExists) {
          console.warn(`Candidate ${candidate.name} (${formattedCandidateAddress}) not found in contract!`);
          console.log('Available candidates:', allCandidates.map(c => `${c.name} (${c.address})`));
          
          // Ask if the user wants to register this candidate in the contract
          if (confirm(`Candidate ${candidate.name} is not registered in this contract. Would you like to register them now?`)) {
            await registerCandidate(
              contractAddress,
              formattedCandidateAddress,
              candidate.name
            );
            
            alert('Candidate registered successfully! Please try refreshing votes again.');
            
            // Clear loading state and exit
            setRefreshingVotes(prev => ({ ...prev, [candidateKey]: false }));
            return;
          } else {
            throw new Error(`Candidate ${candidate.name} is not registered in this contract. Please register them first.`);
          }
        }
        
        console.log(`Candidate ${candidate.name} found in contract, proceeding to get votes...`);
      } catch (candidateCheckError) {
        console.error('Error checking candidates in contract:', candidateCheckError);
        console.log('Will attempt to get votes anyway...');
      }
      
      // Call the contract to get the latest vote count
      const votes = await getVotesByAddress(
        contractAddress, 
        formattedCandidateAddress
      );
      
      console.log(`Retrieved ${votes} votes for candidate ${candidate.name} (${formattedCandidateAddress})`);
      
      // Update the candidate's votes in the database
      const response = await fetch(`/api/admin/elections/${election._id}/candidates/${index}/votes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ votes }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update votes in database');
      }
      
      // Refetch elections to update UI
      refetch();
      
      // Show success message
      alert(`Successfully refreshed votes for ${candidate.name}. Current count: ${votes}`);
      
    } catch (error) {
      console.error('Error refreshing votes:', error);
      
      // Format a more user-friendly error message
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Make some error messages more user-friendly
        if (errorMessage.includes("doesn't support the expected interface")) {
          errorMessage = `The contract at address ${election.contractAddress} doesn't seem to be a valid voting contract. Please verify the address is correct.`;
        } else if (errorMessage.includes("not a contract")) {
          errorMessage = `The address ${election.contractAddress} is not a contract. This may be a regular wallet address or an incorrectly entered contract address.`;
        } else if (errorMessage.includes("Failed to initialize blockchain")) {
          errorMessage = `Failed to connect to the blockchain. Please check your network connection and wallet configuration.`;
        } else if (errorMessage.includes("parameters passed to the contract function may be invalid")) {
          errorMessage = `Invalid candidate address: ${candidate.address}. Please verify this is a valid Ethereum address.`;
        } else if (errorMessage.includes("not registered in this contract")) {
          // Leave the error message as is - it's already clear
        }
      }
      
      alert(`Error refreshing votes: ${errorMessage}`);
    } finally {
      // Clear loading state for this candidate
      setRefreshingVotes(prev => ({ ...prev, [candidateKey]: false }));
    }
  };

  // Add a debug function to check contract validity
  const debugContracts = async () => {
    try {
      console.log('Checking factory contract validity...');
      const factory = getFactoryContract();
      console.log('Factory contract:', factory);
      
      try {
        // Use a direct import instead of dynamic import for getPublicClient
        const { getPublicClient } = await import('@wagmi/core');
        
        // Use type assertion to work around type incompatibility
        // @ts-expect-error - Config type incompatibility between wagmi versions
        const publicClient = getPublicClient(config);
        
        if (!publicClient) {
          console.error('Unable to get publicClient');
          return;
        }
        
        // Check if factory is a valid contract
        const code = await publicClient.getBytecode({ address: factory.address });
        console.log('Factory bytecode exists:', !!code && code !== '0x');
        
        if (!code || code === '0x') {
          console.error('Factory address is not a contract:', factory.address);
          return;
        }

        // Special note to user about contract addresses
        alert(`
Contract Diagnostics Complete:
- Factory contract is valid ✅
- Check the browser console for more details
- If you're having issues with a specific election, use the "Edit" button next to the contract address to update it
- The correct contract address should be visible in your transaction history on Etherscan or in the console logs when creating the election

After updating the address, you'll be able to refresh votes and register candidates correctly.
        `);
        
      } catch (clientError) {
        console.error('Error getting public client:', clientError);
        alert(`Error connecting to blockchain: ${clientError instanceof Error ? clientError.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error in contract debug:', error);
      alert('Error checking contracts. See console for details.');
    }
  };

  // Add a function to update an election's contract address
  const updateContractAddress = async (electionId: string, newAddress: string) => {
    try {
      if (!newAddress.startsWith('0x') || newAddress.length !== 42) {
        alert('Please enter a valid contract address (should start with 0x and be 42 characters long)');
        return;
      }
      
      const response = await fetch(`/api/admin/elections/${electionId}/contract-address`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractAddress: newAddress }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update contract address');
      }
      
      alert(`Contract address updated successfully`);
      refetch();
    } catch (error) {
      console.error('Error updating contract address:', error);
      alert(`Error updating contract address: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Function to handle updating contract address when user clicks
  const handleUpdateContractAddress = (election: Election) => {
    const newAddress = prompt('Enter the new contract address:', election.contractAddress);
    if (newAddress && newAddress !== election.contractAddress) {
      updateContractAddress(election._id, newAddress);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

        {/* Add debug button to check contract validity */}
        <div className="mb-4">
          <button 
            onClick={debugContracts}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Debug Contracts
          </button>
        </div>

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
                  <div className="flex items-center mt-2">
                    <p className="text-sm text-gray-500">Contract: {election.contractAddress}</p>
                    <button 
                      onClick={() => handleUpdateContractAddress(election)}
                      className="ml-2 text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Edit
                    </button>
                  </div>
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
                    {election.candidates.map((candidate, index) => {
                      const candidateKey = `${election._id}_${index}`;
                      const isRefreshing = refreshingVotes[candidateKey];
                      
                      return (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-gray-900">{candidate.name}</p>
                            <p className="text-sm text-gray-500">{candidate.address}</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-lg font-semibold text-gray-900">{candidate.votes} votes</span>
                            <button
                              onClick={() => refreshCandidateVotes(election, candidate, index)}
                              className={`px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={isRefreshing}
                            >
                              {isRefreshing ? 'Refreshing...' : 'Refresh Votes'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
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