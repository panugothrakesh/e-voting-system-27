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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, address } = await request.json()
    console.log('Received request:', { name, address, electionId: params.id })

    if (!name || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('e-voting')

    // Get the election
    const election = await db.collection('elections').findOne({ 
      _id: new ObjectId(params.id) 
    }) as Election | null

    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 })
    }

    // Check if candidate with same address already exists
    if (election.candidates && election.candidates.some(
      (candidate) => candidate.address.toLowerCase() === address.toLowerCase()
    )) {
      return NextResponse.json({ 
        error: 'Candidate with this address already exists' 
      }, { status: 400 })
    }

    // Add candidate to MongoDB
    const candidate: Candidate = {
      name,
      address,
      votes: 0,
      createdAt: new Date()
    }

    const updateResult = await db.collection('elections').updateOne(
      { _id: new ObjectId(params.id) },
      { $push: { candidates: candidate } }
    )

    console.log('MongoDB update result:', updateResult)

    return NextResponse.json({ 
      message: 'Candidate added successfully', 
      candidate
    })
  } catch (err) {
    console.error('Failed to add candidate:', err)
    return NextResponse.json({ 
      error: 'Failed to add candidate',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
} 