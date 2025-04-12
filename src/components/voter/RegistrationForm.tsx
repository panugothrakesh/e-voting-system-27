'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@/store/useStore'
import { useQuery } from '@tanstack/react-query'
import { voteByAddress } from '@/utils/contract'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import Link from 'next/link'

// Helper function for detailed logging
const debugLog = (title: string, data: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ======== ${title} ========`);
  console.log(data);
  console.log("=========================================");
  
  // Also log to localStorage for persistence
  try {
    const logs = JSON.parse(localStorage.getItem('votingLogs') || '[]');
    logs.push({ timestamp, title, data: JSON.stringify(data) });
    localStorage.setItem('votingLogs', JSON.stringify(logs.slice(-20))); // Keep last 20 logs
  } catch (e) {
    console.error("Failed to save log to localStorage:", e);
  }
};

interface RegistrationStatus {
  isRegistered: boolean
  status: 'not_registered' | 'pending' | 'approved' | 'rejected'
}

interface Candidate {
  name: string
  description: string
  votes: number
  address?: string
}

interface Election {
  _id: string
  title: string
  description: string
  startDate: string
  endDate: string
  contractAddress: string
  candidates: Candidate[]
  isActive: boolean
}

const RegistrationForm = () => {
  const { address } = useWallet()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    aadhar: '',
    phoneNumber: '',
    country: '',
    physicalAddress: ''
  })
  const [mounted, setMounted] = useState(false)
  const [showReapplyForm, setShowReapplyForm] = useState(false)
  const [selectedElection, setSelectedElection] = useState<Election | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showVoteConfirmation, setShowVoteConfirmation] = useState(false)
  const router = useRouter()
  const [votedCandidates, setVotedCandidates] = useState<Record<string, boolean>>({})
  const [electionVotingStatus, setElectionVotingStatus] = useState<Record<string, boolean>>({})

  const { data: status, isLoading, refetch } = useQuery<RegistrationStatus>({
    queryKey: ['voterStatus', address],
    queryFn: async () => {
      if (!address) return { isRegistered: false, status: 'not_registered' }
      const response = await fetch(`/api/voter/status?address=${address}`)
      const data = await response.json()
      return data
    },
    enabled: !!address
  })

  const { data: elections, isLoading: isLoadingElections } = useQuery<Election[]>({
    queryKey: ['voterElections', address],
    queryFn: async () => {
      if (!address) return []
      const response = await fetch(`/api/voter/elections?address=${address}`)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    enabled: !!address && status?.status === 'approved'
  })

  // Add a new function to check if the user has voted in the database
  const checkElectionVotingStatus = async () => {
    if (!address || !elections?.length) return;
    
    try {
      // First check localStorage for any voted elections
      const votedElectionsInStorage = Object.keys(votedCandidates)
        .filter(key => votedCandidates[key])
        .map(key => key.split('_')[0]);
      
      console.log('Elections voted in according to localStorage:', votedElectionsInStorage);
      
      // Then check the database
      const response = await fetch(`/api/voter/voting-status?address=${address}`);
      const data = await response.json();
      
      if (response.ok && data.votedElections) {
        console.log('Elections voted in according to database:', data.votedElections);
        
        // Combine the results from localStorage and database
        const votedElectionsSet = new Set([
          ...votedElectionsInStorage,
          ...(data.votedElections || [])
        ]);
        
        // Create a status map for each election
        const statusMap: Record<string, boolean> = {};
        
        elections.forEach(election => {
          statusMap[election._id] = votedElectionsSet.has(election._id);
        });
        
        console.log('Combined voting status:', statusMap);
        setElectionVotingStatus(statusMap);
        
        // Also update localStorage if we found votes in the database that weren't in localStorage
        const updatedVotedCandidates = { ...votedCandidates };
        
        data.votedElections?.forEach((electionId: string) => {
          // If we have this election's vote in the database but not localStorage,
          // add a generic entry for this election
          if (!votedElectionsInStorage.includes(electionId)) {
            const election = elections.find(e => e._id === electionId);
            if (election && election.candidates.length > 0) {
              // Create an entry using the first candidate
              const key = `${electionId}_${election.candidates[0].address || 'unknown'}`;
              updatedVotedCandidates[key] = true;
            }
          }
        });
        
        // Update localStorage and state if we made changes
        if (Object.keys(updatedVotedCandidates).length > Object.keys(votedCandidates).length) {
          setVotedCandidates(updatedVotedCandidates);
          localStorage.setItem('votedCandidates', JSON.stringify(updatedVotedCandidates));
        }
      }
    } catch (error) {
      console.error('Error checking voting status:', error);
    }
  };

  // Check the database for voting status when component mounts and elections are loaded
  useEffect(() => {
    if (mounted && address && elections?.length > 0) {
      checkElectionVotingStatus();
    }
  }, [mounted, address, elections]);

  const handleVoteConfirmation = async () => {
    console.log('Vote confirmation initiated');
    setShowVoteConfirmation(false);
    setIsSubmitting(true);
    
    try {
      // Validate inputs
      if (!selectedCandidate) {
        console.log('No candidate selected');
        return;
      }
      
      if (!selectedElection) {
        console.log('No election selected');
        return;
      }
      
      console.log('Selected election:', selectedElection);
      console.log('Selected candidate:', selectedCandidate);
      
      // First check if wallet is connected
      if (typeof window.ethereum === 'undefined') {
        console.log('No Ethereum provider found');
        return;
      }
      
      // Add validation for candidate address
      if (!selectedCandidate.address) {
        console.error('Candidate has no address!');
        return;
      }
      
      if (!selectedCandidate.address.startsWith('0x') || selectedCandidate.address.length !== 42) {
        console.error('Invalid candidate address format:', selectedCandidate.address);
        return;
      }
      
      // Call the voteByAddress function from our updated contract utility
      console.log('Calling voteByAddress with:', selectedElection.contractAddress, selectedCandidate.address);
      const result = await voteByAddress(
        selectedElection.contractAddress as `0x${string}`,
        selectedCandidate.address as `0x${string}`
      );
      
      // Log the transaction
      console.log('Vote transaction succeeded:', result);
      
      // Reset the form
      setSelectedElection(null);
      setSelectedCandidate(null);
      console.log('Vote successful! Transaction hash: ' + result);
    } catch (error) {
      console.error('Error during voting:', error);
      
      // Display the error message
      if (error instanceof Error) {
        console.error("Voting failed:", error.message);
      } else {
        console.error("Voting failed:", String(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) return

    try {
      const response = await fetch('/api/voter/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          ...formData
        }),
      })

      if (!response.ok) {
        throw new Error('Registration failed')
      }

      // Reset form and refetch status
      setFormData({
        firstName: '',
        lastName: '',
        aadhar: '',
        phoneNumber: '',
        country: '',
        physicalAddress: ''
      })
      setShowReapplyForm(false)
      refetch()
    } catch (error) {
      console.error('Registration error:', error)
    }
  }

  useEffect(() => {
    setMounted(true)
    
    // Check if MetaMask is installed
    if (window.ethereum) {
      console.log("MetaMask is installed");
      
      // Log chain ID
      window.ethereum.request({ method: 'eth_chainId' })
        .then((chainId: string) => {
          console.log("Current chain ID:", parseInt(chainId, 16));
        })
        .catch((err: any) => {
          console.error("Error getting chain ID:", err);
        });
      
      // Log accounts
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          console.log("Connected accounts:", accounts);
        })
        .catch((err: any) => {
          console.error("Error getting accounts:", err);
        });
    } else {
      console.error("MetaMask is not installed");
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      try {
        const savedVotes = localStorage.getItem('votedCandidates');
        if (savedVotes) {
          setVotedCandidates(JSON.parse(savedVotes));
        }
      } catch (e) {
        console.error("Failed to load voted candidates:", e);
      }
    }
  }, [mounted]);

  // Enhanced function to check if the user has voted in an election
  const hasVotedInElection = (electionId: string) => {
    // First check our database-synchronized status map
    if (electionVotingStatus[electionId]) {
      return true;
    }
    
    // Then fall back to localStorage check
    if (!votedCandidates) return false;
    
    // Check if any key in votedCandidates starts with this election's ID
    return Object.keys(votedCandidates).some(key => 
      key.startsWith(`${electionId}_`) && votedCandidates[key]
    );
  };

  if (!mounted) {
    return null
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  // If user has any registration status (pending, approved, or rejected), show status message
  if (status?.status !== 'not_registered' && !showReapplyForm) {
    if (status?.status === 'pending') {
      return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Registration Pending</h2>
          <p className="text-gray-600">
            Your registration is under review. Please wait for admin approval.
          </p>
        </div>
      )
    }
    if (status?.status === 'approved') {
      return (
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Elections</h2>
          
          {isLoadingElections ? (
            <div className="text-center py-8">Loading elections...</div>
          ) : elections?.length === 0 ? (
            <p className="text-gray-600">No active elections at the moment.</p>
          ) : (
            <div className="space-y-6">
              {elections?.map((election) => (
                <div key={election._id} className="border rounded-lg p-4">
                  <h3 className="text-xl font-semibold mb-2">{election.title}</h3>
                  <p className="text-gray-600 mb-4">{election.description}</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Start Date</p>
                      <p>{new Date(election.startDate).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">End Date</p>
                      <p>{new Date(election.endDate).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {/* Check if user has voted in this election */}
                  {hasVotedInElection(election._id) && (
                    <div className="mb-4 bg-green-100 text-green-800 p-3 rounded-md text-center font-medium">
                      ✓ You have already voted in this election
                    </div>
                  )}
                  
                  {!hasVotedInElection(election._id) && <div className="space-y-4">
                    <h4 className="font-medium">Candidates</h4>
                    {election.candidates.map((candidate, index) => {
                      // Create a unique key for this candidate
                      const candidateKey = `${election._id}_${candidate.address}`;
                      const hasVoted = votedCandidates[candidateKey];
                      // Check if user has voted in this election at all
                      const electionVoted = hasVotedInElection(election._id);
                      
                      return (
                        <div key={index} className="border rounded p-3">
                          <h5 className="font-medium">{candidate.name}</h5>
                          <p className="text-gray-600">{candidate.description}</p>
                          {hasVoted ? (
                            <div className="mt-2 bg-green-100 text-green-800 px-4 py-2 rounded text-center">
                              ✓ You have voted for this candidate
                            </div>
                          ) : electionVoted ? (
                            <button
                              className="mt-2 bg-gray-300 text-gray-500 px-4 py-2 rounded w-full cursor-not-allowed"
                              disabled
                            >
                              Already Voted
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                debugLog("Vote Button Clicked", { 
                                  candidateName: candidate.name,
                                  candidateAddress: candidate.address,
                                  electionTitle: election.title,
                                  contractAddress: election.contractAddress,
                                  yourWallet: address
                                });
                                
                                try {
                                  // Show loading indicator
                                  setIsSubmitting(true);
                                  
                                  if (!candidate.address) {
                                    console.error("This candidate does not have a valid address");
                                    setIsSubmitting(false);
                                    return;
                                  }
                                  
                                  if (!election.contractAddress) {
                                    console.error("This election does not have a valid contract address");
                                    setIsSubmitting(false);
                                    return;
                                  }
                                  
                                  // Call the voteByAddress function with the correct contract address
                                  const result = await voteByAddress(
                                    election.contractAddress as `0x${string}`,
                                    candidate.address as `0x${string}`
                                  );
                                  
                                  debugLog("Vote Transaction Result", { 
                                    txHash: result.txHash,
                                    success: result.success
                                  });
                                  
                                  // Mark this candidate as voted for
                                  setVotedCandidates(prev => ({
                                    ...prev,
                                    [candidateKey]: true
                                  }));
                                  
                                  // Save to localStorage to persist between sessions
                                  try {
                                    const voted = JSON.parse(localStorage.getItem('votedCandidates') || '{}');
                                    voted[candidateKey] = true;
                                    localStorage.setItem('votedCandidates', JSON.stringify(voted));
                                  } catch (e) {
                                    console.error("Failed to save voted state:", e);
                                  }
                                  
                                  alert(`Vote cast successfully! Transaction hash: ${result.txHash}`);
                                } catch (error) {
                                  debugLog("Voting Failed", { 
                                    error: error instanceof Error ? error.message : String(error),
                                    errorObject: String(error)
                                  });
                                  
                                  if (error instanceof Error) {
                                    alert('Error casting vote: ' + error.message);
                                  } else {
                                    alert('An unexpected error occurred while casting your vote');
                                  }
                                } finally {
                                  setIsSubmitting(false);
                                }
                              }}
                              className="mt-2 bg-blue-600 text-gray-900 px-4 py-2 rounded hover:bg-blue-700 w-full"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? 'Processing...' : 'Vote'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
    }
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    if (status?.status === 'rejected') {
      return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Registration Rejected</h2>
          <p className="text-gray-600 mb-4">
            Your registration has been rejected. Please review your information and try again.
          </p>
          <button
            onClick={() => setShowReapplyForm(true)}
            className="w-full bg-blue-600 text-gray-900 py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Reapply
          </button>
        </div>
      )
    }
  }

  // Vote Confirmation Modal
  if (showVoteConfirmation && selectedCandidate && selectedElection) {
    console.log("⭐ VOTE CONFIRMATION STATE:", {
      showVoteConfirmation,
      selectedCandidate,
      selectedElection,
    });
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md w-full">
          <h3 className="text-xl font-bold mb-4">Confirm Your Vote</h3>
          <p className="mb-4">
            You are about to vote for <strong>{selectedCandidate.name}</strong> in the election <strong>{selectedElection.title}</strong>.
          </p>
          <p className="mb-2">
            <strong>Candidate Address:</strong> {selectedCandidate.address || 'No address specified'}
          </p>
          <p className="mb-2">
            <strong>Contract Address:</strong> {selectedElection.contractAddress || 'No contract address specified'}
          </p>
          <p className="mb-4 text-red-600">
            This action cannot be undone and will require a blockchain transaction.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                console.log("Cancel button clicked");
                setShowVoteConfirmation(false);
              }}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                console.log("Confirm vote button clicked");
                handleVoteConfirmation();
              }}
              className="px-4 py-2 bg-blue-600 text-gray-900 rounded hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Confirm Vote'}
            </button>
          </div>
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-gray-500 mb-2">Troubleshooting Options:</p>
            <button
              onClick={async () => {
                console.log("Testing MetaMask connection");
                try {
                  if (!window.ethereum) {
                    throw new Error("MetaMask not installed");
                  }
                  
                  const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                  });
                  
                  console.log("Connected accounts:", accounts);
                  console.log(`Current chain ID: ${parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16)} (${parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16) === 11155111 ? 'Sepolia - Correct!' : 'NOT Sepolia - Please switch networks'})`);
                } catch (error) {
                  console.error("MetaMask test failed:", error);
                }
              }}
              type="button"
              className="w-full mt-2 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Test MetaMask Connection
            </button>
            
            <button
              onClick={() => {
                console.log("DEBUG CONTRACT INFO");
                console.log("Election:", selectedElection);
                console.log("Candidate:", selectedCandidate);
              }}
              type="button"
              className="w-full mt-2 bg-yellow-200 text-yellow-800 py-2 px-4 rounded-md hover:bg-yellow-300"
            >
              Debug Contract Info
            </button>
            
            <button
              onClick={async () => {
                console.log("Direct vote with raw Ethereum API");
                try {
                  if (!window.ethereum) {
                    throw new Error("MetaMask not installed");
                  }
                  
                  if (!selectedCandidate?.address || !selectedElection?.contractAddress) {
                    throw new Error("Missing candidate or election address");
                  }
                  
                  const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                  });
                  
                  if (!accounts || accounts.length === 0) {
                    throw new Error("No accounts connected");
                  }
                  
                  const functionSignature = '0x82c4a948'; // keccak256("voteByAddress(address)")
                  const paddedAddress = (selectedCandidate.address as string).slice(2).padStart(64, '0');
                  const txData = `${functionSignature}${paddedAddress}`;
                  
                  console.log("Raw transaction data:", {
                    from: accounts[0],
                    to: selectedCandidate.address,
                    data: txData
                  });
                  
                  // Send raw transaction
                  const txHash = await window.ethereum.request({
                    method: 'eth_sendTransaction',
                    params: [{
                      from: accounts[0],
                      to: selectedCandidate.address,
                      data: txData,
                      gas: '0x30D40', // 200,000 gas
                    }]
                  });
                  
                  console.log("Transaction sent with hash:", txHash);
                } catch (error) {
                  console.error("Direct vote failed:", error);
                }
              }}
              type="button"
              className="w-full mt-2 bg-red-200 text-red-800 py-2 px-4 rounded-md hover:bg-red-300"
            >
              Direct Vote (Raw)
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Voter Registration</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Number</label>
          <input
            type="text"
            value={formData.aadhar}
            onChange={(e) => setFormData({ ...formData, aadhar: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <input
            type="text"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Physical Address</label>
          <textarea
            value={formData.physicalAddress}
            onChange={(e) => setFormData({ ...formData, physicalAddress: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-gray-900 py-2 px-4 rounded-md hover:bg-blue-700"
        >
          {showReapplyForm ? 'Reapply for Registration' : 'Submit Registration'}
        </button>
      </form>
    </div>
  )
}

export default RegistrationForm 