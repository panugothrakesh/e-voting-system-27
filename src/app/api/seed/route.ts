import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { encryptAddress } from '@/utils/crypto'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('e-voting')

    // Sample voters data
    const voters = [
      {
        firstName: 'John',
        lastName: 'Doe',
        aadhar: '123456789012',
        phoneNumber: '+1234567890',
        country: 'India',
        physicalAddress: '123 Main St, City, State',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        aadhar: '987654321098',
        phoneNumber: '+1987654321',
        country: 'India',
        physicalAddress: '456 Oak St, City, State',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    // Add encrypted addresses
    const votersWithAddresses = voters.map((voter, index) => ({
      ...voter,
      encryptedAddress: encryptAddress(`0x${index.toString().padStart(40, '0')}`),
      hashedAddress: `0x${index.toString().padStart(40, '0')}`
    }))

    // Clear existing voters
    await db.collection('voters').deleteMany({})

    // Insert new voters
    const result = await db.collection('voters').insertMany(votersWithAddresses)

    return NextResponse.json({ 
      message: 'Database seeded successfully',
      insertedCount: result.insertedCount
    })
  } catch (error) {
    console.error('Error seeding database:', error)
    return NextResponse.json({ 
      error: 'Failed to seed database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 