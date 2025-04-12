import { NextRequest, NextResponse } from 'next/server'
import { sendGasEth } from '@/utils/web3'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

/**
 * Handles POST requests to send ETH for gas fees to a voter's address
 * Updates the voter record with gas transaction details
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { voterId, amount = "0.01" } = body

    // Validate required fields
    if (!voterId) {
      return NextResponse.json({ error: 'Voter ID is required' }, { status: 400 })
    }

    // Retrieve the voter address from MongoDB
    const { db } = await connectToDatabase()
    const voter = await db.collection('voters').findOne({ 
      _id: new ObjectId(voterId) 
    })

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 })
    }

    // Send gas ETH to the voter's address
    const result = await sendGasEth(voter.address, amount)

    // Update the voter record to indicate gas was sent
    await db.collection('voters').updateOne(
      { _id: new ObjectId(voterId) },
      { 
        $set: { 
          gasSent: true,
          gasAmount: amount,
          gasTxHash: result.txHash,
          gasTimestamp: new Date()
        } 
      }
    )

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${amount} ETH to ${voter.address}`,
      txHash: result.txHash
    })
  } catch (error) {
    console.error('Error sending gas ETH:', error)
    return NextResponse.json({ error: (error as Error).message || 'Unknown error occurred' }, { status: 500 })
  }
} 