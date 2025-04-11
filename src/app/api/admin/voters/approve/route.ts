import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(request: Request) {
  try {
    const { walletAddress, action } = await request.json()

    if (!walletAddress || !action) {
      return NextResponse.json({ error: 'Wallet address and action are required' }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('e-voting')
    const voter = await db.collection('voters').findOne({ walletAddress })

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 })
    }

    await db.collection('voters').updateOne(
      { walletAddress },
      { $set: { status: action === 'approve' ? 'approved' : 'rejected' } }
    )

    return NextResponse.json({ 
      message: `Voter ${action}ed successfully`,
      status: action === 'approve' ? 'approved' : 'rejected'
    })
  } catch (error) {
    console.error('Error in voter approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 