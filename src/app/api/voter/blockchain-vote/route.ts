import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { hashAddress } from '@/utils/crypto'
import { ObjectId } from 'mongodb'
import { hasVoted } from '@/utils/contract'

// Define types
interface Candidate {
  name: string
  address?: string
  votes: number
  description?: string
}

interface Election {
  _id: ObjectId
  title: string
  description: string
  contractAddress: string
  isActive: boolean
  candidates: Candidate[]
}

export async function POST(request: Request) {
  try {
    const { contractAddress, candidateAddress, candidateName, electionId, txHash } = await request.json()
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    if (!contractAddress || !candidateAddress || !electionId || !txHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('e-voting')

    // Hash the address for lookup
    const hashedAddress = hashAddress(address)

    // First check if the voter exists
    const voter = await db.collection('voters').findOne({ hashedAddress })
    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 })
    }

    // Check if the voter has already voted in this election
    const existingVote = await db.collection('votes').findOne({
      hashedAddress,
      electionId
    })

    if (existingVote) {
      return NextResponse.json({ error: 'Already voted in this election' }, { status: 400 })
    }

    // Verify the vote on the blockchain
    try {
      const hasVotedOnChain = await hasVoted(contractAddress as `0x${string}`, address)
      if (!hasVotedOnChain) {
        return NextResponse.json({ error: 'Vote not found on blockchain' }, { status: 400 })
      }
    } catch (error) {
      console.error('Error verifying vote on blockchain:', error)
      return NextResponse.json({ error: 'Failed to verify vote on blockchain' }, { status: 500 })
    }

    // Record the vote
    const voteResult = await db.collection('votes').insertOne({
      hashedAddress,
      electionId,
      candidateAddress,
      candidateName,
      contractAddress,
      txHash,
      votedAt: new Date()
    })

    // Update the voter's record to mark them as having voted
    await db.collection('voters').updateOne(
      { hashedAddress },
      {
        $set: {
          hasVoted: true,
          lastVotedElectionId: electionId,
          lastVotedAt: new Date()
        }
      }
    )

    // Also record in blockchain-votes collection for redundancy
    await db.collection('blockchain-votes').insertOne({
      hashedAddress,
      electionId,
      candidateAddress,
      candidateName,
      contractAddress,
      txHash,
      votedAt: new Date()
    })

    // Update the election's candidate vote count
    await db.collection('elections').updateOne(
      { 
        _id: new ObjectId(electionId),
        'candidates.address': candidateAddress
      },
      {
        $inc: { 'candidates.$.votes': 1 }
      }
    )

    return NextResponse.json({
      success: true,
      voteId: voteResult.insertedId
    })
  } catch (error) {
    console.error('Error recording blockchain vote:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 