import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { encryptAddress, hashAddress } from '@/utils/crypto'

export async function POST(request: Request) {
  try {
    const { walletAddress, firstName, lastName, aadhar, phoneNumber, country, physicalAddress } = await request.json()

    if (!walletAddress || !firstName || !lastName || !aadhar || !phoneNumber || !country || !physicalAddress) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('e-voting')

    // Check if voter already exists using hashed address
    const hashedAddress = hashAddress(walletAddress)
    const existingVoter = await db.collection('voters').findOne({ hashedAddress })

    if (existingVoter) {
      return NextResponse.json({ 
        error: 'Voter already registered',
        status: existingVoter.status 
      }, { status: 400 })
    }

    // Encrypt the wallet address
    const encryptedAddress = encryptAddress(walletAddress)

    // Create new voter registration
    const result = await db.collection('voters').insertOne({
      encryptedAddress,
      hashedAddress,
      firstName,
      lastName,
      aadhar,
      phoneNumber,
      country,
      physicalAddress,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    if (!result.acknowledged) {
      throw new Error('Failed to insert voter record')
    }

    // Verify the record was inserted
    const insertedVoter = await db.collection('voters').findOne({ _id: result.insertedId })
    if (!insertedVoter) {
      throw new Error('Failed to verify voter record insertion')
    }

    return NextResponse.json({ 
      message: 'Voter registered successfully',
      status: 'pending'
    })
  } catch (error) {
    console.error('Error registering voter:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 