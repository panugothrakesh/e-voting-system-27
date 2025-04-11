import { config } from '@/config/wagmi'
import { writeContract, readContract, getPublicClient } from '@wagmi/core'
import { type Address, type BaseError, type Hash } from 'viem'

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

// Create a new election
export async function createElection(
  name: string,
  description: string
): Promise<string> {
  try {
    console.log('Creating election with params:', { name, description })
    
    // Get current list of deployments before creating new election
    const beforeDeployments = await getDeployedElections()
    console.log('Elections before creation:', beforeDeployments)
    
    // @ts-expect-error - Config type incompatibility
    const hash = await writeContract(config, {
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'createElection',
      args: [name, description]
    })

    console.log('Transaction hash:', hash)

    // Get the public client for interacting with the blockchain
    // @ts-expect-error - Config type incompatibility
    const publicClient = getPublicClient(config)
    if (!publicClient) {
      throw new Error('Failed to get public client')
    }

    console.log('Waiting for transaction receipt...')
    let receipt
    
    try {
      // Set a longer timeout (30 seconds) for receipt retrieval
      receipt = await publicClient.waitForTransactionReceipt({ 
        hash, 
        timeout: 30_000,
        confirmations: 1 // Only wait for 1 confirmation
      })
    } catch (receiptError) {
      console.error('Error getting transaction receipt:', receiptError)
      throw new Error('Failed to get transaction receipt: ' + 
        (receiptError instanceof Error ? receiptError.message : String(receiptError)))
    }
    
    console.log('Transaction receipt received:', receipt)
    
    // Check if the transaction was successful
    if (receipt.status !== 'success') {
      throw new Error('Transaction failed or was reverted')
    }
    
    // Wait a moment for blockchain state to update
    console.log('Waiting for blockchain state to update...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Get updated list of deployments after creating new election
    const afterDeployments = await getDeployedElections()
    console.log('Elections after creation:', afterDeployments)
    
    // Find the new contract address (should be the one that wasn't in the before list)
    const newDeployments = afterDeployments.filter(addr => !beforeDeployments.includes(addr))
    console.log('New deployments:', newDeployments)
    
    let contractAddress: string | undefined
    
    if (newDeployments.length > 0) {
      // Use the most recently deployed contract (should be just one)
      contractAddress = newDeployments[0]
      console.log('New election created at:', contractAddress)
      return contractAddress
    }
    
    // Use a BigInt-safe logging function
    const logBigIntSafe = (label: string, obj: unknown) => {
      console.log(label, JSON.parse(JSON.stringify(obj, (_, value) => 
        typeof value === 'bigint' ? value.toString() : value
      )))
    }
    
    // If we can't find a new deployment, fall back to checking logs
    logBigIntSafe('Transaction logs:', receipt.logs)
    
    // Print out more detailed information about each log
    console.log('Analyzing logs for contract address:')
    receipt.logs.forEach((log, i) => {
      console.log(`Log #${i}:`, {
        address: log.address,
        topicsLength: log.topics?.length,
        topics: log.topics,
        dataLength: log.data?.length,
        dataPrefix: log.data?.substring(0, 66)
      })
    })
    
    // The event might be identified by the contract address being the first topic
    for (const log of receipt.logs) {
      if (log.topics && log.topics.length >= 2 && log.topics[1]) {
        if (log.address === FACTORY_ADDRESS) {
          // Extract the address from the second topic (indexed contractAddress)
          contractAddress = '0x' + log.topics[1].slice(26)
          console.log('Found contract address from indexed topic:', contractAddress)
          break
        }
      }
    }
    
    // If no address found yet, try looking at the data field
    if (!contractAddress && receipt.logs.length > 0) {
      const lastLog = receipt.logs[receipt.logs.length - 1]
      
      // If the log has a data field and it's from our factory
      if (lastLog && lastLog.data && lastLog.data.length > 66 && lastLog.address === FACTORY_ADDRESS) {
        // Data field usually contains the address at position 0-64 (32 bytes)
        // Try a few different positions
        const possibleAddresses = [
          '0x' + lastLog.data.slice(26, 66),  // Standard position
          '0x' + lastLog.data.slice(2, 42),   // Alternative position 1
          '0x' + lastLog.data.slice(64, 104), // Alternative position 2
        ]
        
        console.log('Possible addresses from data field:', possibleAddresses)
        
        // Check each possible address for validity
        for (const addr of possibleAddresses) {
          if (addr.startsWith('0x') && addr.length === 42) {
            // Simple validation: must be 0x + 40 hex characters
            const isValidHex = /^0x[0-9a-fA-F]{40}$/.test(addr)
            if (isValidHex) {
              console.log('Found valid address from data field:', addr)
              contractAddress = addr
              break
            }
          }
        }
      }
    }
    
    // If still no address found, look for any address-like pattern in logs
    if (!contractAddress) {
      console.log('Searching for any address pattern in logs...')
      
      // Combine all topics and data from all logs
      const allTextData = receipt.logs.flatMap(log => {
        return [
          ...(log.topics || []),
          log.data || ''
        ]
      }).join('')
      
      // Search for patterns that look like Ethereum addresses
      const addressRegex = /0x[0-9a-fA-F]{40}/g
      const allAddresses = allTextData.match(addressRegex) || []
      
      console.log('All addresses found in logs:', allAddresses)
      
      // Filter out the factory address and any zero addresses
      const zeroAddress = '0x0000000000000000000000000000000000000000'
      const candidateAddresses = allAddresses.filter(addr => 
        addr !== FACTORY_ADDRESS.toLowerCase() && 
        addr !== FACTORY_ADDRESS && 
        addr !== zeroAddress
      )
      
      if (candidateAddresses.length > 0) {
        // Take the first non-factory, non-zero address
        contractAddress = candidateAddresses[0]
        console.log('Found potential contract address by regex:', contractAddress)
      }
    }
    
    // If still no address, try to get the created contract address from the transaction receipt
    if (!contractAddress && receipt.contractAddress) {
      contractAddress = receipt.contractAddress
      console.log('Using contract address from receipt:', contractAddress)
    }

    if (!contractAddress) {
      throw new Error('Could not determine the created contract address. The transaction was successful, but no new contract could be identified. Please check the factory contract\'s getDeployedVotings function directly.')
    }

    console.log('Election created at:', contractAddress)
    return contractAddress
  } catch (error) {
    console.error('Error creating election:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to create election')
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

    // @ts-ignore
    const result = await writeContract(config, {
      address,
      abi: VOTING_ABI,
      functionName: 'whitelistVoters',
      args: [voterAddresses]
    })

    console.log('Transaction hash:', result)

    // @ts-ignore
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
export async function voteByAddress(
  contractAddress: string,
  candidateAddress: string
): Promise<void> {
  try {
    console.log('Voting by address:', { contractAddress, candidateAddress })
    
    const address = contractAddress as Address
    const candidate = candidateAddress as Address
    if (!address || !candidate) {
      throw new Error('Invalid addresses')
    }

    // @ts-ignore
    const result = await writeContract(config, {
      address,
      abi: VOTING_ABI,
      functionName: 'voteByAddress',
      args: [candidate]
    })

    console.log('Transaction hash:', result)

    // @ts-ignore
    const publicClient = getPublicClient(config)
    if (!publicClient) {
      throw new Error('Failed to get public client')
    }

    await publicClient.waitForTransactionReceipt({ hash: result })
  } catch (error) {
    console.error('Error voting:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to vote')
  }
}

// End voting and declare winner
export async function endVotingAndDeclareWinner(contractAddress: string): Promise<void> {
  try {
    console.log('Ending voting and declaring winner:', contractAddress)
    
    const address = contractAddress as Address
    if (!address) {
      throw new Error('Invalid contract address')
    }

    // @ts-ignore
    const result = await writeContract(config, {
      address,
      abi: VOTING_ABI,
      functionName: 'endVotingAndDeclareWinner',
      args: []
    })

    console.log('Transaction hash:', result)

    // @ts-ignore
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

    // @ts-ignore
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

    // @ts-ignore
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

    // @ts-ignore
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

    // @ts-ignore
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

    // @ts-ignore
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

    // @ts-ignore
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

    // @ts-ignore
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

    // @ts-ignore
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

    // @ts-ignore
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