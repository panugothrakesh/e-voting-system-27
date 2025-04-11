import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(request: Request) {
  try {
    const { walletAddress, action } = await request.json()

    if (!walletAddress || !action) {
      return NextResponse.json(
        { error: 'Wallet address and action are required' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be either "approve" or "reject"' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db('e-voting')

    // Find the voter by encrypted address
    const voter = await db.collection('voters').findOne({
      encryptedAddress: walletAddress
    })

    if (!voter) {
      return NextResponse.json(
        { error: 'Voter not found' },
        { status: 404 }
      )
    }

    // Update the voter's status
    const result = await db.collection('voters').updateOne(
      { encryptedAddress: walletAddress },
      { 
        $set: { 
          status: action === 'approve' ? 'approved' : 'rejected',
          updatedAt: new Date().toISOString()
        } 
      }
    )

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to update voter status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: `Voter ${action}ed successfully`
    })
  } catch (error) {
    console.error('Error in POST /api/admin/voters/approve:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 