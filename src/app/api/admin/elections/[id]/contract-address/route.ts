import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { contractAddress } = await request.json()
    
    console.log('Updating contract address:', { electionId: params.id, contractAddress })

    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      return NextResponse.json({ error: 'Invalid contract address format' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('e-voting')

    // Update the election's contract address
    const updateResult = await db.collection('elections').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { contractAddress: contractAddress } }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 })
    }

    console.log('Contract address updated successfully:', updateResult)

    return NextResponse.json({ 
      success: true, 
      message: 'Contract address updated successfully' 
    })
  } catch (err) {
    console.error('Failed to update contract address:', err)
    return NextResponse.json({ 
      error: 'Failed to update contract address',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
} 