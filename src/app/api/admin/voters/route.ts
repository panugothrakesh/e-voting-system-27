import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('e-voting')
    const voters = await db.collection('voters')
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json(voters)
  } catch (error) {
    console.error('Error fetching voters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 