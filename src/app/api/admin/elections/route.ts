import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('e-voting')
    
    const elections = await db.collection('elections')
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json(elections)
  } catch (err) {
    console.error('Failed to fetch elections:', err)
    return NextResponse.json({ error: 'Failed to fetch elections' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { title, description, startDate, endDate, candidates } = await request.json()

    if (!title || !description || !startDate || !endDate || !candidates?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('e-voting')

    const election = {
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      candidates: candidates.map((candidate: { name: string; description: string }) => ({
        ...candidate,
        votes: 0
      })),
      isActive: true,
      createdAt: new Date()
    }

    await db.collection('elections').insertOne(election)

    return NextResponse.json({ message: 'Election created successfully', election })
  } catch (err) {
    console.error('Failed to create election:', err)
    return NextResponse.json({ error: 'Failed to create election' }, { status: 500 })
  }
} 