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
    // Extract data from the request
    const { electionId, candidateName, candidateAddress, voterAddress } = await request.json()

    // Validate the request
    if (!electionId || !candidateName || !candidateAddress || !voterAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('e-voting')

    // Get hashed address for lookups
    const hashedAddress = hashAddress(voterAddress)
    
    // Find the voter
    const voter = await db.collection('voters').findOne({ hashedAddress })
    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 })
    }

    // Check if voter is approved
    if (voter.status !== 'approved' || !voter.isWhitelisted) {
      return NextResponse.json({ error: 'Voter is not approved for voting' }, { status: 403 })
    }

    // Check if voter was approved for this specific election
    if (voter.approvedElectionId && voter.approvedElectionId.toString() !== electionId) {
      return NextResponse.json({ 
        error: 'Voter is not approved for this election' 
      }, { status: 403 })
    }

    // Find the election
    const election = await db.collection('elections').findOne({ 
      _id: new ObjectId(electionId) 
    }) as unknown as Election
    
    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 })
    }

    if (!election.isActive) {
      return NextResponse.json({ error: 'Election is not active' }, { status: 400 })
    }

    // Verify if the candidate exists in this election
    const candidate = election.candidates.find((c: Candidate) => c.name === candidateName)
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found in this election' }, { status: 404 })
    }

    // Check if address matches (if candidate address is stored)
    if (candidate.address && candidate.address !== candidateAddress) {
      return NextResponse.json({ 
        error: 'Candidate address mismatch' 
      }, { status: 400 })
    }

    // Check if voter already voted in this election in our database
    const existingVote = await db.collection('votes').findOne({
      electionId,
      hashedAddress
    })

    if (existingVote) {
      return NextResponse.json({ 
        error: 'You have already voted in this election according to our records' 
      }, { status: 400 })
    }

    // Double-check with the blockchain that the vote was actually cast
    // This helps ensure our database stays in sync with the blockchain
    try {
      const contractAddress = election.contractAddress as `0x${string}`
      const alreadyVoted = await hasVoted(contractAddress, voterAddress)
      
      if (!alreadyVoted) {
        return NextResponse.json({ 
          error: 'Vote not found on blockchain. Please try voting again.' 
        }, { status: 400 })
      }
    } catch (error) {
      console.error('Error verifying vote on blockchain:', error)
      // Continue anyway since the frontend already completed the blockchain transaction
      console.log('Proceeding with database update despite blockchain verification error')
    }

    // Record the vote in our database
    await db.collection('votes').insertOne({
      electionId,
      hashedAddress,
      candidateName,
      candidateAddress,
      timestamp: new Date()
    })

    // Update candidate votes count
    const updateResult = await db.collection('elections').updateOne(
      { 
        _id: new ObjectId(electionId),
        'candidates.name': candidateName
      },
      { 
        $inc: { 'candidates.$.votes': 1 }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ 
        error: 'Failed to update vote count' 
      }, { status: 500 })
    }

    // Mark the voter as having voted in this election
    await db.collection('voters').updateOne(
      { hashedAddress },
      { 
        $set: { 
          hasVoted: true,
          lastVotedElectionId: electionId,
          votedAt: new Date()
        } 
      }
    )

    return NextResponse.json({ 
      success: true,
      message: 'Vote has been recorded successfully' 
    })
  } catch (error) {
    console.error('Error recording blockchain vote:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 