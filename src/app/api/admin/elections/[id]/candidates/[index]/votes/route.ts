import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

interface Candidate {
  name: string;
  address: string;
  votes: number;
  createdAt: Date;
}

interface Election {
  _id: ObjectId;
  title: string;
  description: string;
  candidates: Candidate[];
  contractAddress: string;
  isActive: boolean;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string, index: string } }
) {
  try {
    const { votes } = await request.json()
    const candidateIndex = parseInt(params.index)
    
    if (isNaN(candidateIndex) || candidateIndex < 0) {
      return NextResponse.json({ error: 'Invalid candidate index' }, { status: 400 })
    }
    
    console.log('Updating votes:', { electionId: params.id, candidateIndex, votes })

    const client = await clientPromise
    const db = client.db('e-voting')

    // Get the election
    const election = await db.collection('elections').findOne({ 
      _id: new ObjectId(params.id) 
    }) as Election | null

    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 })
    }

    // Check if candidate exists
    if (!election.candidates || candidateIndex >= election.candidates.length) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Update candidate votes
    const updateKey = `candidates.${candidateIndex}.votes`
    const updateResult = await db.collection('elections').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { [updateKey]: votes } }
    )

    console.log('MongoDB update result:', updateResult)

    return NextResponse.json({ 
      message: 'Votes updated successfully', 
      votes
    })
  } catch (err) {
    console.error('Failed to update votes:', err)
    return NextResponse.json({ 
      error: 'Failed to update votes',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
} 