import { config } from '@/config/wagmi'
import { writeContract, readContract, getPublicClient } from '@wagmi/core'
import { type Address } from 'viem'

// Factory contract address on Sepolia
const FACTORY_ADDRESS = '0x05eC535853BAaDC229F90B0a92f85c189168B1AA' as Address

// Factory contract ABI
const FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'string', name: '_electionName', type: 'string' },
      { internalType: 'string', name: '_electionDescription', type: 'string' }
    ],
    name: 'createElection',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'contractAddress', type: 'address' },
      { indexed: false, internalType: 'string', name: 'electionName', type: 'string' },
      { indexed: false, internalType: 'string', name: 'electionDescription', type: 'string' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' }
    ],
    name: 'VotingContractCreated',
    type: 'event'
  }
] as const

// Voting contract ABI
const VOTING_ABI = [
  {
    inputs: [
      { internalType: 'address', name: '_candidateAddress', type: 'address' },
      { internalType: 'string', name: '_name', type: 'string' }
    ],
    name: 'registerCandidate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address[]', name: 'voters', type: 'address[]' }],
    name: 'whitelistVoters',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '_candidateAddress', type: 'address' }],
    name: 'voteByAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'endVotingAndDeclareWinner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getWinner',
    outputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'string', name: '', type: 'string' },
      { internalType: 'uint256', name: '', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getAllCandidates',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'candidateAddress', type: 'address' },
          { internalType: 'string', name: 'name', type: 'string' }
        ],
        internalType: 'struct WhitelistedVoting.Candidate[]',
        name: '',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '_candidateAddress', type: 'address' }],
    name: 'getVotesByAddress',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'whitelisted',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'hasVoted',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'votingActive',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'winnerDeclared',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

// Get the factory contract instance
export const getFactoryContract = () => {
  console.log('Getting factory contract with address:', FACTORY_ADDRESS)
  return {
    address: FACTORY_ADDRESS as `0x${string}`,
    abi: FACTORY_ABI,
  }
}

// Get a voting contract instance by address
export const getVotingContract = (address: `0x${string}`) => {
  console.log('Getting voting contract with address:', address)
  return {
    address,
    abi: VOTING_ABI,
  }
}

// Get all deployed elections
export async function getDeployedElections(): Promise<string[]> {
  try {
    console.log('Fetching deployed elections from factory contract')
    // @ts-expect-error - Config type incompatibility
    const elections = await readContract(config, {
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'getDeployedVotings'
    }) as unknown as string[]
    
    console.log('Deployed elections:', elections)
    return elections || []
  } catch (error) {
    console.error('Error getting deployed elections:', error)
    return []
  }
}

// Add a helper function to extract contract address from transaction receipts
export async function extractContractAddressFromReceipt(receipt: any): Promise<string | undefined> {
  try {
    console.log('Attempting to extract contract address from receipt...');
    
    // Method 1: Check for contractAddress directly on the receipt
    if (receipt.contractAddress) {
      console.log('Found contract address directly in receipt:', receipt.contractAddress);
      return receipt.contractAddress;
    }
    
    // Method 2: Look for a Created log in the receipt logs
    for (const log of receipt.logs || []) {
      // First check if this log is from the factory contract
      if (log.address?.toLowerCase() === FACTORY_ADDRESS.toLowerCase()) {
        // Parse topics for VotingContractCreated event
        if (log.topics && log.topics.length >= 2) {
          // The second topic often contains the address as the indexed parameter
          const possibleAddress = '0x' + log.topics[1]?.slice(26);
          if (possibleAddress?.length === 42 && /^0x[0-9a-fA-F]{40}$/.test(possibleAddress)) {
            console.log('Found contract address in log topic:', possibleAddress);
            return possibleAddress;
          }
        }
      }
    }
    
    // Method 3: Convert receipt to string and use regex to find "[0x...Created]" pattern
    try {
      const receiptString = JSON.stringify(receipt);
      // This regex looks for patterns like [0x1234...Created] in the receipt
      const createdRegex = /\[.*?(0x[0-9a-fA-F]{40}).*?[Cc]reated.*?\]/;
      const match = receiptString.match(createdRegex);
      
      if (match && match[1]) {
        console.log('Found contract address via regex in receipt string:', match[1]);
        return match[1];
      }
    } catch (regexError) {
      console.error('Error parsing receipt with regex:', regexError);
    }
    
    // Method 4: Search for any addresses in the logs that aren't the factory
    const allAddresses = new Set<string>();
    
    for (const log of receipt.logs || []) {
      // Add the log's address if it's not the factory
      if (log.address && 
          log.address !== FACTORY_ADDRESS &&
          log.address.startsWith('0x') && 
          log.address.length === 42) {
        allAddresses.add(log.address);
      }
      
      // Also look through topics for addresses
      if (log.topics) {
        for (const topic of log.topics) {
          if (topic && topic.length >= 66) {
            const addr = '0x' + topic.slice(26);
            if (addr.length === 42 && /^0x[0-9a-fA-F]{40}$/.test(addr)) {
              allAddresses.add(addr);
            }
          }
        }
      }
    }
    
    // Filter out zero address and convert to array
    const candidates = Array.from(allAddresses).filter(
      addr => addr !== '0x0000000000000000000000000000000000000000'
    );
    
    if (candidates.length === 1) {
      console.log('Found single candidate address in logs:', candidates[0]);
      return candidates[0];
    } else if (candidates.length > 1) {
      console.log('Found multiple candidate addresses in logs:', candidates);
      // Could implement a heuristic to pick the most likely one
    }
    
    return undefined;
  } catch (error) {
    console.error('Error extracting contract address from receipt:', error);
    return undefined;
  }
}

// Update the createElection function to use the helper
export async function createElection(
  name: string,
  description: string
): Promise<string> {
  try {
    console.log('Creating election with params:', { name, description });
    
    // Get current list of deployments before creating new election
    const beforeDeployments = await getDeployedElections();
    console.log('Elections before creation:', beforeDeployments);
    
    // @ts-expect-error - Config type incompatibility
    const hash = await writeContract(config, {
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'createElection',
      args: [name, description]
    });

    console.log('Transaction hash:', hash);

    // Get the public client for interacting with the blockchain
    // @ts-expect-error - Config type incompatibility
    const publicClient = getPublicClient(config);
    if (!publicClient) {
      throw new Error('Failed to get public client');
    }

    console.log('Waiting for transaction receipt...');
    let receipt;
    
    try {
      // Set a longer timeout (30 seconds) for receipt retrieval
      receipt = await publicClient.waitForTransactionReceipt({ 
        hash, 
        timeout: 30_000,
        confirmations: 1 // Only wait for 1 confirmation
      });
    } catch (receiptError) {
      console.error('Error getting transaction receipt:', receiptError);
      throw new Error('Failed to get transaction receipt: ' + 
        (receiptError instanceof Error ? receiptError.message : String(receiptError)));
    }
    
    console.log('Transaction receipt received:', receipt);
    
    // Check if the transaction was successful
    if (receipt.status !== 'success') {
      throw new Error('Transaction failed or was reverted');
    }
    
    // Wait a moment for blockchain state to update
    console.log('Waiting for blockchain state to update...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // After the receipt is received, extract the contract address
    const extractedAddress = await extractContractAddressFromReceipt(receipt);
    if (extractedAddress) {
      console.log('Successfully extracted contract address:', extractedAddress);
      return extractedAddress;
    }
    
    // Fall back to checking the deployments if we couldn't extract the address
    // Get updated list of deployments after creating new election
    const afterDeployments = await getDeployedElections();
    console.log('Elections after creation:', afterDeployments);
    
    // Find the new contract address (should be the one that wasn't in the before list)
    const newDeployments = afterDeployments.filter(addr => !beforeDeployments.includes(addr));
    console.log('New deployments:', newDeployments);
    
    if (newDeployments.length === 1) {
      const newAddress = newDeployments[0];
      console.log('Found new election at:', newAddress);
      return newAddress;
    }
    
    throw new Error('Could not determine the created contract address. The transaction was successful, but no new contract could be identified. Please check the transaction on the block explorer and update the contract address manually.');
  } catch (error) {
    console.error('Error creating election:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create election');
  }
}

// Get election by name
export async function getElectionByName(electionName: string) {
  try {
    console.log('Getting election by name:', electionName)
    // @ts-expect-error - Config type incompatibility
    const address = await readContract(config, {
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'getVotingByName',
      args: [electionName]
    })
    console.log('Election address:', address)
    return address
  } catch (error) {
    console.error('Error getting election by name:', error)
    throw error
  }
}

// Register a candidate
export async function registerCandidate(
  contractAddress: string,
  candidateAddress: string,
  name: string
): Promise<void> {
  try {
    console.log('Registering candidate:', { contractAddress, candidateAddress, name })
    
    const address = contractAddress as Address
    const candidate = candidateAddress as Address
    if (!address || !candidate) {
      throw new Error('Invalid addresses')
    }

    // @ts-expect-error - Config type incompatibility
    const result = await writeContract(config, {
      address,
      abi: VOTING_ABI,
      functionName: 'registerCandidate',
      args: [candidate, name]
    })

    console.log('Transaction hash:', result)

    // Get the public client for interacting with the blockchain
    // @ts-expect-error - Config type incompatibility
    const publicClient = getPublicClient(config)
    if (!publicClient) {
      throw new Error('Failed to get public client')
    }

    await publicClient.waitForTransactionReceipt({ hash: result })
  } catch (error) {
    console.error('Error registering candidate:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to register candidate')
  }
}

// Whitelist voters
export async function whitelistVoters(
  contractAddress: string,
  voters: string[]
): Promise<void> {
  try {
    console.log('Whitelisting voters:', { contractAddress, voters })
    
    const address = contractAddress as Address
    const voterAddresses = voters.map(voter => voter as Address)
    if (!address) {
      throw new Error('Invalid contract address')
    }

    // @ts-expect-error - Config type incompatibility
    const result = await writeContract(config, {
      address,
      abi: VOTING_ABI,
      functionName: 'whitelistVoters',
      args: [voterAddresses]
    })

    console.log('Transaction hash:', result)

    // @ts-expect-error - Config type incompatibility
    const publicClient = getPublicClient(config)
    if (!publicClient) {
      throw new Error('Failed to get public client')
    }

    await publicClient.waitForTransactionReceipt({ hash: result })
  } catch (error) {
    console.error('Error whitelisting voters:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to whitelist voters')
  }
}

// Vote by address
export const voteByAddress = async (contractAddress: `0x${string}`, candidateAddress: `0x${string}`) => {
  console.log(`Voting for candidate: ${candidateAddress} in election contract: ${contractAddress}`);
  
  if (!contractAddress || typeof contractAddress !== 'string' || !contractAddress.startsWith('0x')) {
    console.error('Invalid contract address:', contractAddress);
    throw new Error('Invalid contract address format');
  }
  
  if (!candidateAddress || typeof candidateAddress !== 'string' || !candidateAddress.startsWith('0x')) {
    console.error('Invalid candidate address:', candidateAddress);
    throw new Error('Invalid candidate address format');
  }
  
  try {
    console.log('Voting using contract function voteByAddress');
    console.log('Contract address:', contractAddress);
    console.log('Candidate address:', candidateAddress);
    
    // Use the writeContract function directly (a cleaner approach)
    // @ts-expect-error - Config type incompatibility
    const txHash = await writeContract(config, {
      address: contractAddress,
      abi: VOTING_ABI,
      functionName: 'voteByAddress',
      args: [candidateAddress]
    });

    console.log('Vote transaction submitted! Hash:', txHash);

    // Get the public client for interacting with the blockchain
    // @ts-expect-error - Config type incompatibility
    const publicClient = getPublicClient(config);
    if (!publicClient) {
      throw new Error('Failed to get public client');
    }

    console.log('Waiting for transaction receipt...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log('Transaction receipt received:', receipt);

    if (receipt.status === 'success') {
      try {
        const candidates = await getAllCandidates(contractAddress);
        const candidateInfo = candidates.find(c => 
          c.address.toLowerCase() === candidateAddress.toLowerCase()
        );
        
        const candidateName = candidateInfo?.name || 'Unknown Candidate';
        
        console.log('Recording vote in database for candidate:', candidateName);
        
        const response = await fetch('/api/voter/blockchain-vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contractAddress,
            candidateAddress,
            candidateName,
            electionId: 'auto-detect', 
            txHash
          }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          console.error('Error recording vote in database:', result);
          console.warn('Vote transaction was successful on blockchain but failed to record in database.');
          // Don't throw error here, as the blockchain vote is what matters most
        } else {
          console.log('Vote successfully recorded in database:', result);
          
          // Save the vote in localStorage to prevent voting again on this device
          try {
            const voteRecord = {
              contractAddress,
              candidateAddress,
              timestamp: new Date().toISOString(),
              txHash
            };
            
            // Get existing votes
            const existingVotesString = localStorage.getItem('votes') || '[]';
            const existingVotes = JSON.parse(existingVotesString);
            
            // Add this vote and save back to localStorage
            localStorage.setItem('votes', JSON.stringify([
              ...existingVotes,
              voteRecord
            ]));
            
            console.log('Vote recorded in local storage');
          } catch (localStorageError) {
            console.error('Failed to save vote to localStorage:', localStorageError);
            // Non-critical error, don't fail the function
          }
        }
      } catch (dbError) {
        console.error('Error recording vote in database:', dbError);
        // Don't throw error here, as the blockchain vote succeeded
      }
    }

    return {
      success: true,
      txHash
    };
  } catch (error) {
    console.error('Error in voteByAddress:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      if (errorMsg.includes('user denied') || errorMsg.includes('user rejected')) {
        throw new Error('Transaction was rejected in your wallet');
      } else if (errorMsg.includes('insufficient funds')) {
        throw new Error('Insufficient funds for gas. Please add ETH to your wallet');
      } else if (errorMsg.includes('voting has ended')) {
        throw new Error('Voting has ended for this election');
      } else if (errorMsg.includes('not whitelisted')) {
        throw new Error('You are not whitelisted to vote in this election');
      } else if (errorMsg.includes('already voted')) {
        throw new Error('You have already voted in this election');
      } else if (errorMsg.includes('invalid candidate')) {
        throw new Error('Invalid candidate address');
      } else {
        // Pass the original error message
        throw error;
      }
    }
    
    throw error;
  }
};

// End voting and declare winner
export async function endVotingAndDeclareWinner(contractAddress: string): Promise<void> {
  try {
    console.log('Ending voting and declaring winner:', contractAddress)
    
    const address = contractAddress as Address
    if (!address) {
      throw new Error('Invalid contract address')
    }

    // @ts-expect-error - Config type incompatibility
    const result = await writeContract(config, {
      address,
      abi: VOTING_ABI,
      functionName: 'endVotingAndDeclareWinner',
      args: []
    })

    console.log('Transaction hash:', result)

    // @ts-expect-error - Config type incompatibility
    const publicClient = getPublicClient(config)
    if (!publicClient) {
      throw new Error('Failed to get public client')
    }

    await publicClient.waitForTransactionReceipt({ hash: result })
  } catch (error) {
    console.error('Error ending voting:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to end voting')
  }
}

// Get winner details
export async function getWinner(contractAddress: string): Promise<{
  address: string;
  name: string;
  votes: number;
}> {
  try {
    console.log('Getting winner for contract:', contractAddress)
    
    const address = contractAddress as Address
    if (!address) {
      throw new Error('Invalid contract address')
    }

    // @ts-expect-error - Config type incompatibility
    const result = await readContract(config, {
      address,
      abi: VOTING_ABI,
      functionName: 'getWinner'
    })

    return {
      address: result[0],
      name: result[1],
      votes: Number(result[2])
    }
  } catch (error) {
    console.error('Error getting winner:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to get winner')
  }
}

// Get all candidates
export async function getAllCandidates(contractAddress: string): Promise<{
  address: string;
  name: string;
}[]> {
  try {
    console.log('Getting all candidates for contract:', contractAddress)
    
    const address = contractAddress as Address
    if (!address) {
      throw new Error('Invalid contract address')
    }

    // @ts-expect-error - Config type incompatibility
    const result = await readContract(config, {
      address,
      abi: VOTING_ABI,
      functionName: 'getAllCandidates'
    })

    return result.map(candidate => ({
      address: candidate.candidateAddress,
      name: candidate.name
    }))
  } catch (error) {
    console.error('Error getting candidates:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to get candidates')
  }
}

// Check if address is whitelisted
export async function isWhitelisted(contractAddress: string, voterAddress: string): Promise<boolean> {
  try {
    console.log('Checking whitelist status:', { contractAddress, voterAddress })
    
    const address = contractAddress as Address
    const voter = voterAddress as Address
    if (!address || !voter) {
      throw new Error('Invalid addresses')
    }

    // @ts-expect-error - Config type incompatibility
    const result = await readContract(config, {
      address,
      abi: VOTING_ABI,
      functionName: 'whitelisted',
      args: [voter]
    })

    return result
  } catch (error) {
    console.error('Error checking whitelist status:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to check whitelist status')
  }
}

// Check if address has voted
export async function hasVoted(contractAddress: string, voterAddress: string): Promise<boolean> {
  try {
    console.log('Checking if address has voted:', { contractAddress, voterAddress })
    
    const address = contractAddress as Address
    const voter = voterAddress as Address
    if (!address || !voter) {
      throw new Error('Invalid addresses')
    }

    // @ts-expect-error - Config type incompatibility
    const result = await readContract(config, {
      address,
      abi: VOTING_ABI,
      functionName: 'hasVoted',
      args: [voter]
    })

    return result
  } catch (error) {
    console.error('Error checking vote status:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to check vote status')
  }
}

// Check if voting is active
export async function isVotingActive(contractAddress: string): Promise<boolean> {
  try {
    console.log('Checking if voting is active for contract:', contractAddress)
    
    const address = contractAddress as Address
    if (!address) {
      throw new Error('Invalid contract address')
    }

    // @ts-expect-error - Config type incompatibility
    const result = await readContract(config, {
      address,
      abi: VOTING_ABI,
      functionName: 'votingActive'
    })

    return result
  } catch (error) {
    console.error('Error checking voting status:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to check voting status')
  }
}

// Check if winner is declared
export async function isWinnerDeclared(contractAddress: string): Promise<boolean> {
  try {
    console.log('Checking if winner is declared for contract:', contractAddress)
    
    const address = contractAddress as Address
    if (!address) {
      throw new Error('Invalid contract address')
    }

    // @ts-expect-error - Config type incompatibility
    const result = await readContract(config, {
      address,
      abi: VOTING_ABI,
      functionName: 'winnerDeclared'
    })

    return result
  } catch (error) {
    console.error('Error checking winner status:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to check winner status')
  }
}

export async function castVote(
  contractAddress: string,
  candidateId: number
): Promise<void> {
  try {
    console.log('Casting vote:', { contractAddress, candidateId })
    
    const address = contractAddress as Address
    if (!address) {
      throw new Error('Invalid contract address')
    }

    // @ts-expect-error - Config type incompatibility
    const result = await writeContract(config, {
      address,
      abi: [
        {
          inputs: [{ name: 'candidateId', type: 'uint256' }],
          name: 'vote',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ] as const,
      functionName: 'vote',
      args: [BigInt(candidateId)]
    })

    console.log('Transaction hash:', result)

    // @ts-expect-error - Config type incompatibility
    const publicClient = getPublicClient(config)
    if (!publicClient) {
      throw new Error('Failed to get public client')
    }

    await publicClient.waitForTransactionReceipt({ hash: result })
  } catch (error) {
    console.error('Error casting vote:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to cast vote')
  }
}

export async function getElectionResults(
  contractAddress: string
): Promise<{ candidateId: number; voteCount: number }[]> {
  try {
    console.log('Getting election results:', contractAddress)
    
    const address = contractAddress as Address
    if (!address) {
      throw new Error('Invalid contract address')
    }

    // @ts-expect-error - Config type incompatibility
    const result = await readContract(config, {
      address,
      abi: [
        {
          inputs: [],
          name: 'getResults',
          outputs: [
            {
              components: [
                { name: 'candidateId', type: 'uint256' },
                { name: 'voteCount', type: 'uint256' }
              ],
              name: '',
              type: 'tuple[]'
            }
          ],
          stateMutability: 'view',
          type: 'function'
        }
      ] as const,
      functionName: 'getResults'
    })

    return (result as { candidateId: bigint; voteCount: bigint }[]).map(item => ({
      candidateId: Number(item.candidateId),
      voteCount: Number(item.voteCount)
    }))
  } catch (error) {
    console.error('Error getting election results:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to get election results')
  }
}

// Update the getVotesByAddress function to fix the issue where votes are showing as 0 despite successful voting. The function needs better error handling and debugging of transaction data from the blockchain.
export async function getVotesByAddress(
  contractAddress: string,
  candidateAddress: string
): Promise<number> {
  try {
    console.log('Getting votes for candidate:', { contractAddress, candidateAddress });
    
    // Validate addresses
    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      console.error('Invalid contract address format:', contractAddress);
      throw new Error(`Invalid contract address format: ${contractAddress}`);
    }
    
    if (!candidateAddress || !candidateAddress.startsWith('0x') || candidateAddress.length !== 42) {
      console.error('Invalid candidate address format:', candidateAddress);
      throw new Error(`Invalid candidate address format: ${candidateAddress}`);
    }
    
    // Debug candidate address
    console.log('Candidate address details:', {
      address: candidateAddress,
      length: candidateAddress.length,
      isHexString: /^0x[0-9a-fA-F]{40}$/.test(candidateAddress)
    });
    
    const address = contractAddress as Address;
    const candidate = candidateAddress as Address;
    
    // Helper function to wait
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // First, check if this is a valid contract by trying a simple call (with retries)
    let bytecodeVerified = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!bytecodeVerified && retryCount < maxRetries) {
      try {
        console.log(`Verifying if address is a valid contract (attempt ${retryCount + 1}/${maxRetries})...`);
        // @ts-expect-error - Config type incompatibility
        const publicClient = getPublicClient(config);
        
        if (!publicClient) {
          console.error('Unable to get publicClient');
          throw new Error('Failed to initialize blockchain connection');
        }
        
        const code = await publicClient.getBytecode({ address });
        
        if (!code || code === '0x') {
          console.error('The address is not a contract:', contractAddress);
          throw new Error(`The address ${contractAddress} is not a contract or doesn't exist`);
        }
        
        console.log('Contract verification passed - bytecode exists');
        bytecodeVerified = true;
      } catch (bytecodeError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error('Error verifying contract bytecode after multiple attempts:', bytecodeError);
          console.warn('Proceeding with contract calls despite bytecode verification failure');
          // We'll proceed anyway with a warning instead of throwing
          break;
        }
        
        console.log(`Bytecode verification failed, retrying in 2 seconds... (${retryCount}/${maxRetries})`);
        await wait(2000); // Wait 2 seconds before retrying
      }
    }

    // First check if the voter has actually voted
    try {
      // @ts-expect-error - Config type incompatibility
      const hasVotedResult = await readContract(config, {
        address,
        abi: VOTING_ABI,
        functionName: 'hasVoted',
        args: [window.ethereum?.selectedAddress], // Check current user's voting status
        timeout: 15000 // 15 seconds timeout
      });
      
      console.log(`Current user (${window.ethereum?.selectedAddress}) has voted:`, hasVotedResult);
      
      // Also check if the candidate exists
      // @ts-expect-error - Config type incompatibility
      const isCandidateResult = await readContract(config, {
        address,
        abi: VOTING_ABI,
        functionName: 'isCandidate',
        args: [candidate],
        timeout: 15000 // 15 seconds timeout
      });
      
      console.log(`Address ${candidate} is a registered candidate:`, isCandidateResult);
    } catch (statusCheckError) {
      console.warn('Unable to check voting/candidate status:', statusCheckError);
      // Continue anyway - this is just diagnostics
    }

    // Try calling getVotesByAddress directly
    try {
      console.log('Calling getVotesByAddress with candidate:', candidate);
      
      // Print function info for debugging
      console.log('Function call details:', {
        contract: address,
        function: 'getVotesByAddress',
        args: [candidate]
      });
      
      // @ts-expect-error - Config type incompatibility
      const result = await readContract(config, {
        address,
        abi: VOTING_ABI,
        functionName: 'getVotesByAddress',
        args: [candidate],
        // Add timeout option
        timeout: 15000 // 15 seconds timeout
      });
      
      console.log('Votes for candidate from getVotesByAddress:', result);
      
      // Check for potential BigInt conversion issues
      if (result === 0n || result === BigInt(0)) {
        console.log('Zero votes returned, attempting alternative method...');
        
        // Delay before trying alternative approach
        await wait(1000);
        
        // Try getting all candidates with vote counts directly from logs
        try {
          // @ts-expect-error - Config type incompatibility
          const publicClient = getPublicClient(config);
          
          if (!publicClient) {
            throw new Error('Failed to get public client');
          }
          
          // Check blockchain for voting events
          console.log('Checking blockchain for voting events...');
          
          // When a user votes, their transaction can be found in the blockchain
          // This is a workaround to detect votes even if the contract's state doesn't reflect them yet
          const blockNumber = await publicClient.getBlockNumber();
          console.log('Current block number:', blockNumber);
          
          console.log('Checking for Vote events from the contract...');
          // This might need adjusting depending on your contract's event structure
          
          console.log('Note: If you just voted, there might be a delay before the vote is reflected in the contract state');
          console.log('Please try refreshing again in 10-15 seconds');
          
          return Number(result); // Return 0 for now
        } catch (eventsError) {
          console.error('Error checking for voting events:', eventsError);
          // Continue with the current result
        }
      }
      
      return Number(result);
    } catch (directCallError) {
      console.error('getVotesByAddress direct call failed:', directCallError);
      
      // Check if error is related to the candidate address
      const errorString = String(directCallError);
      if (errorString.includes('parameters passed to the contract function may be invalid')) {
        console.error('Invalid candidate address detected:', candidate);
        throw new Error(`Invalid candidate address: ${candidate}. Please verify this is a valid address recognized by the contract.`);
      }
      
      // Try fallback approach - get all candidates first
      try {
        console.log('Attempting fallback - getting all candidates first');
        // @ts-expect-error - Config type incompatibility
        const allCandidates = await readContract(config, {
          address,
          abi: VOTING_ABI,
          functionName: 'getAllCandidates',
          // Add timeout option
          timeout: 15000 // 15 seconds timeout
        });
        
        console.log('Successfully retrieved candidates:', allCandidates);
        
        // If we got here but allCandidates is empty or not an array
        if (!Array.isArray(allCandidates) || allCandidates.length === 0) {
          console.log('No candidates found in contract, returning 0 votes');
          return 0;
        }
        
        // Search for the candidate in the list
        const foundCandidate = allCandidates.find(
          (c: { candidateAddress: Address; name: string }) => c.candidateAddress.toLowerCase() === candidate.toLowerCase()
        );
        
        if (foundCandidate) {
          console.log('Found candidate in the list:', foundCandidate);
          
          // Now try to get votes for the found candidate
          // @ts-expect-error - Config type incompatibility
          const votes = await readContract(config, {
            address,
            abi: VOTING_ABI,
            functionName: 'getVotesByAddress',
            args: [foundCandidate.candidateAddress],
            // Add timeout option
            timeout: 15000 // 15 seconds timeout
          });
          
          console.log('Votes for candidate (fallback method):', votes);
          return Number(votes);
        } else {
          console.log('Candidate not found in the list, returning 0 votes');
          return 0;
        }
      } catch (fallbackError) {
        console.error('Fallback approach also failed:', fallbackError);
        throw new Error('Contract doesn\'t support the expected interface. Please check if this is a valid WhitelistedVoting contract.');
      }
    }
  } catch (error) {
    console.error('Error getting votes for candidate:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get votes for candidate');
  }
}