import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('e-voting')

    // Clear existing data
    await db.collection('voters').deleteMany({})
    await db.collection('elections').deleteMany({})

    // Create dummy voters
    const voters = [
      { address: '0xEc97ADF38aD8421cf8bdcaD2dA11883748b80839', isWhitelisted: true, hasVoted: false, createdAt: new Date() },
      { address: '0x1234567890123456789012345678901234567890', isWhitelisted: true, hasVoted: false, createdAt: new Date() },
      { address: '0x0987654321098765432109876543210987654321', isWhitelisted: false, hasVoted: false, createdAt: new Date() },
    ]
    await db.collection('voters').insertMany(voters)

    // Create dummy election
    const election = {
      title: 'Student Council Election 2024',
      description: 'Annual election for student council positions',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      candidates: [
        { name: 'John Doe', description: 'President Candidate', votes: 0 },
        { name: 'Jane Smith', description: 'Vice President Candidate', votes: 0 },
        { name: 'Mike Johnson', description: 'Secretary Candidate', votes: 0 },
      ],
      isActive: true,
      createdAt: new Date()
    }
    await db.collection('elections').insertOne(election)

    return NextResponse.json({ 
      message: 'Database seeded successfully',
      voters,
      election 
    })
  } catch (err) {
    console.error('Failed to seed database:', err)
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 })
  }
} 