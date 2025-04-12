import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

/**
 * Update the election status (active/inactive)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validate the ID
    if (!params.id || !ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid election ID' }, { status: 400 })
    }

    const { isActive } = await request.json()

    // Validate input
    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean value' }, { status: 400 })
    }

    // Connect to MongoDB
    const client = await clientPromise
    const db = client.db('e-voting')

    // Update the election
    const result = await db.collection('elections').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { isActive } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      message: `Election status updated to ${isActive ? 'active' : 'inactive'}`
    })
  } catch (error) {
    console.error('Error updating election status:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 