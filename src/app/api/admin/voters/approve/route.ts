import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { decryptAddress } from '@/utils/crypto'
import { ObjectId } from 'mongodb'

// This would typically be provided via environment variables
// Note: In production, use proper key management and secure storage
// const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || ''; // Server-side wallet key

export async function POST(request: Request) {
  try {
    console.log('Voter approval API called')
    const body = await request.json()
    console.log('Request body received:', body)
    const { walletAddress, action, electionContractAddress, electionId } = body

    if (!walletAddress || !action) {
      console.log('Missing required fields')
      return NextResponse.json(
        { error: 'Wallet address and action are required' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      console.log('Invalid action:', action)
      return NextResponse.json(
        { error: 'Invalid action. Must be either "approve" or "reject"' },
        { status: 400 }
      )
    }

    // For approve action, validate election details
    if (action === 'approve') {
      if (!electionId) {
        console.log('Missing election ID for approval')
        return NextResponse.json(
          { error: 'Election ID is required for approval' },
          { status: 400 }
        )
      }
    }

    console.log('Connecting to MongoDB')
    const client = await clientPromise
    const db = client.db('e-voting')

    // Find the voter by encrypted address
    console.log('Finding voter with encrypted address:', walletAddress)
    const voter = await db.collection('voters').findOne({
      encryptedAddress: walletAddress
    })

    if (!voter) {
      console.log('Voter not found')
      return NextResponse.json(
        { error: 'Voter not found' },
        { status: 404 }
      )
    }
    console.log('Voter found:', voter)

    // For now, only database update - we'll add server-side blockchain interaction later
    // when admin wallet can be properly configured with private key
    let blockchainStatus = 'not_attempted';
    let blockchainError = '';

    // Attempt blockchain interaction - disabled for now, would need proper server wallet
    // This is just a placeholder showing how it would work if implemented
    if (action === 'approve' && electionContractAddress) {
      console.log('Server would handle blockchain interaction here');
      // In production implementation, this would use the server's wallet to interact
      // with the blockchain without requiring MetaMask from the user
      
      try {
        // Decrypt address for blockchain interaction
        const decryptedAddress = decryptAddress(walletAddress);
        console.log('Decrypted voter address:', decryptedAddress);
        
        // This is where the actual blockchain interaction would happen with a server wallet
        // For now, just log what would have happened
        console.log(`Would whitelist voter ${decryptedAddress} on contract ${electionContractAddress}`);
        
        // Comment out actual contract interaction until server wallet is configured
        /*
        await whitelistVoters(
          electionContractAddress as `0x${string}`, 
          [decryptedAddress as `0x${string}`]
        );
        */
        
        blockchainStatus = 'simulated_success';
      } catch (error) {
        console.error('Blockchain interaction would have failed:', error);
        blockchainStatus = 'simulated_failure';
        blockchainError = error instanceof Error ? error.message : String(error);
      }
    }

    // Update the voter's status in the database
    console.log('Updating voter status in database')
    
    // Prepare update document
    const updateData: Record<string, string | boolean | Date | ObjectId> = { 
      status: action === 'approve' ? 'approved' : 'rejected',
      isWhitelisted: action === 'approve',
      updatedAt: new Date().toISOString()
    }
    
    // Add election data for approved voters
    if (action === 'approve' && electionId) {
      console.log('Adding election data to voter:', { electionId, electionContractAddress })
      updateData.approvedElectionId = new ObjectId(electionId)
      updateData.approvedElectionContractAddress = electionContractAddress || ''
    }
    
    console.log('Update data:', JSON.stringify(updateData, (key, value) => 
      value instanceof ObjectId ? value.toString() : value
    ))
    
    const result = await db.collection('voters').updateOne(
      { encryptedAddress: walletAddress },
      { $set: updateData }
    )
    console.log('Database update result:', result)

    if (result.modifiedCount === 0) {
      console.log('Failed to update database')
      return NextResponse.json(
        { error: 'Failed to update voter status' },
        { status: 500 }
      )
    }

    const successMessage = `Voter ${action}ed successfully in database. Blockchain status: ${blockchainStatus}`
    console.log(successMessage)
    return NextResponse.json({ 
      success: true,
      message: successMessage,
      blockchainStatus,
      blockchainError
    })
  } catch (error) {
    console.error('Error in POST /api/admin/voters/approve:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 