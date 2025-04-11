import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { hashAddress } from '@/utils/crypto'
import { ObjectId } from 'mongodb'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('e-voting')

    // Use hashed address to find the voter
    const hashedAddress = hashAddress(address)
    // Try to find voter by hashed address or encrypted address
    let voter = await db.collection('voters').findOne({ hashedAddress })
    
    // If not found, try by encrypted address (for backwards compatibility)
    if (!voter) {
      console.log('Voter not found by hashedAddress, trying by encryptedAddress')
      voter = await db.collection('voters').findOne({ 
        encryptedAddress: address // Some older voters might have the raw wallet address stored
      })
    }

    if (!voter) {
      console.log('Voter not found with address:', address)
      return NextResponse.json({ 
        error: 'Voter not found',
      }, { status: 404 })
    }
    
    console.log('Found voter:', { 
      id: voter._id,
      status: voter.status,
      hasApprovedElection: !!voter.approvedElectionId
    })

    // If the voter is not approved, return empty array
    if (voter.status !== 'approved') {
      return NextResponse.json([])
    }

    // If the voter is approved but doesn't have a specific election, get all active elections
    // This is for backward compatibility with existing voters
    if (!voter.approvedElectionId) {
      const allElections = await db.collection('elections')
        .find({ isActive: true })
        .toArray()
      
      return NextResponse.json(allElections || [])
    }
    
    console.log('Voter approved for election ID:', voter.approvedElectionId)
    
    // Get the specific election the voter is approved for
    const election = await db.collection('elections').findOne({ 
      _id: new ObjectId(voter.approvedElectionId),
      isActive: true  // Only return active elections
    })
    
    console.log('Found election:', election ? 'Yes' : 'No')
    
    // Return array with the single election or empty if not found/not active
    return NextResponse.json(election ? [election] : [])
  } catch (error) {
    console.error('Error fetching voter elections:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 