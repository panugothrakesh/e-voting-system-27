import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { hashAddress } from '@/utils/crypto'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('e-voting')

    // Use hashed address for lookup
    const hashedAddress = hashAddress(address)
    const voter = await db.collection('voters').findOne({ hashedAddress })

    if (!voter) {
      return NextResponse.json({ 
        isRegistered: false,
        status: 'not_registered'
      })
    }

    return NextResponse.json({
      isRegistered: true,
      status: voter.status
    })
  } catch (error) {
    console.error('Error checking voter status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 