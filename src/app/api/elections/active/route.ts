import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('e-voting')
    
    const elections = await db.collection('elections')
      .find({ 
        isActive: true,
        endDate: { $gt: new Date() }
      })
      .toArray()

    return NextResponse.json(elections)
  } catch (err) {
    console.error('Failed to fetch active elections:', err)
    return NextResponse.json({ error: 'Failed to fetch active elections' }, { status: 500 })
  }
} 