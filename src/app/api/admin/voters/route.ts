import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    console.log('Fetching voters from database...')
    const client = await clientPromise
    const db = client.db('e-voting')
    
    // Get voters from database
    const voters = await db.collection('voters')
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    console.log('Found voters:', voters.length)

    if (!Array.isArray(voters)) {
      console.error('Voters is not an array:', voters)
      return NextResponse.json([], { status: 200 })
    }

    // Process voters for display
    const processedVoters = voters.map(voter => {
      try {
        // Create a masked version of the encrypted address for display
        const maskedAddress = `${voter.encryptedAddress.slice(0, 6)}...${voter.encryptedAddress.slice(-4)}`

        return {
          ...voter,
          // Store the original encrypted address
          encryptedAddress: voter.encryptedAddress,
          // Use masked encrypted address for display
          displayAddress: maskedAddress,
          // Keep the original encrypted address for operations
          walletAddress: voter.encryptedAddress
        }
      } catch (error) {
        console.error('Error processing voter:', error)
        return {
          ...voter,
          displayAddress: 'Error processing address',
          walletAddress: 'Error processing address'
        }
      }
    })

    console.log('Returning processed voters')
    return NextResponse.json(processedVoters)
  } catch (error) {
    console.error('Error in GET /api/admin/voters:', error)
    return NextResponse.json([], { status: 200 })
  }
} 