import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(request: Request) {
  try {
    const { walletAddress, firstName, lastName, aadhar, phoneNumber, country, physicalAddress } = await request.json()

    if (!walletAddress || !firstName || !lastName || !aadhar || !phoneNumber || !country || !physicalAddress) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('e-voting')

    // Check if voter is already registered
    const existingVoter = await db.collection('voters').findOne({ walletAddress })
    if (existingVoter) {
      return NextResponse.json({ 
        error: 'You have already submitted a registration request',
        status: existingVoter.status 
      }, { status: 400 })
    }

    // Create new voter registration
    await db.collection('voters').insertOne({
      walletAddress,
      firstName,
      lastName,
      aadhar,
      phoneNumber,
      country,
      physicalAddress,
      status: 'pending',
      createdAt: new Date()
    })

    return NextResponse.json({ 
      message: 'Registration submitted successfully',
      status: 'pending'
    })
  } catch (error) {
    console.error('Error in voter registration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 