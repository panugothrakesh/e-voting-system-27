import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { hashAddress, decryptAddress } from '@/utils/crypto'

export async function POST(request: Request) {
  try {
    const { electionId, candidateIndex, voterAddress } = await request.json()

    if (!electionId || candidateIndex === undefined || !voterAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('e-voting')

    // Check if voter exists and is approved
    const hashedAddress = hashAddress(voterAddress)
    const voter = await db.collection('voters').findOne({ hashedAddress })

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 })
    }

    if (voter.status !== 'approved') {
      return NextResponse.json({ error: 'Voter not approved' }, { status: 403 })
    }

    // Check if election exists and is active
    const election = await db.collection('elections').findOne({ _id: electionId })
    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 })
    }

    if (!election.isActive) {
      return NextResponse.json({ error: 'Election is not active' }, { status: 400 })
    }

    // Check if voter has already voted in this election
    const existingVote = await db.collection('votes').findOne({
      electionId,
      hashedAddress
    })

    if (existingVote) {
      return NextResponse.json({ error: 'Already voted in this election' }, { status: 400 })
    }

    // Record the vote
    await db.collection('votes').insertOne({
      electionId,
      hashedAddress,
      candidateIndex,
      createdAt: new Date()
    })

    // Update candidate votes count
    await db.collection('elections').updateOne(
      { _id: electionId, 'candidates.index': candidateIndex },
      { $inc: { 'candidates.$.votes': 1 } }
    )

    // Here you would typically interact with the smart contract
    // using the decrypted address
    const decryptedAddress = decryptAddress(voter.encryptedAddress)
    console.log('Decrypted address:', decryptedAddress)
    // TODO: Call smart contract with decryptedAddress

    return NextResponse.json({ message: 'Vote recorded successfully' })
  } catch (error) {
    console.error('Error recording vote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 