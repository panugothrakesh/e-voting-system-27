import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(request: Request) {
  try {
    const { electionId, candidateName, voterAddress } = await request.json()

    if (!electionId || !candidateName || !voterAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('e-voting')

    // Check if voter exists and is whitelisted
    const voter = await db.collection('voters').findOne({ 
      address: voterAddress.toLowerCase(),
      isWhitelisted: true
    })

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found or not whitelisted' }, { status: 403 })
    }

    if (voter.hasVoted) {
      return NextResponse.json({ error: 'Voter has already cast their vote' }, { status: 403 })
    }

    // Update election with vote
    const result = await db.collection('elections').updateOne(
      { 
        _id: electionId,
        'candidates.name': candidateName
      },
      { 
        $inc: { 'candidates.$.votes': 1 }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Election or candidate not found' }, { status: 404 })
    }

    // Mark voter as voted
    await db.collection('voters').updateOne(
      { address: voterAddress.toLowerCase() },
      { $set: { hasVoted: true } }
    )

    return NextResponse.json({ message: 'Vote cast successfully' })
  } catch (err) {
    console.error('Failed to cast vote:', err)
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
  }
} 