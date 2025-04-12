import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { hashAddress } from '@/utils/crypto'

/**
 * API endpoint to check which elections a voter has voted in
 * 
 * @route GET /api/voter/voting-status
 * @param {string} address - The voter's wallet address
 * @returns {object} Object containing arrays of election IDs the voter has voted in
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('e-voting')

    // Hash the address for lookup (the same way it's stored in the database)
    const hashedAddress = hashAddress(address)
    
    // Find all votes by this voter
    const votes = await db.collection('votes').find({ 
      hashedAddress 
    }).toArray()
    
    // Extract just the election IDs where the user has voted
    const votedElections = votes.map(vote => vote.electionId)
    
    console.log(`Found ${votes.length} votes for address ${address.slice(0, 6)}...${address.slice(-4)}`)
    console.log('Voted elections:', votedElections)
    
    // Also check the voters collection for any records of votes
    const voter = await db.collection('voters').findOne({ hashedAddress })
    
    if (voter && voter.hasVoted && voter.lastVotedElectionId && !votedElections.includes(voter.lastVotedElectionId)) {
      votedElections.push(voter.lastVotedElectionId)
    }
    
    // Check for any blockchain votes that might be recorded
    const blockchainVotes = await db.collection('blockchain-votes').find({ 
      hashedAddress 
    }).toArray()
    
    // Add any blockchain votes not already included
    blockchainVotes.forEach(vote => {
      if (vote.electionId && !votedElections.includes(vote.electionId)) {
        votedElections.push(vote.electionId)
      }
    })
    
    return NextResponse.json({
      address: address,
      votedElections: votedElections,
      totalVotes: votedElections.length
    })
  } catch (error) {
    console.error('Error checking voter voting status:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 