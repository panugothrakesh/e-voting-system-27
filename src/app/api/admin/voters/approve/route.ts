import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { decryptAddress } from '@/utils/crypto'
import { ObjectId } from 'mongodb'
import { sendEth } from '@/utils/contractUtils'

export async function POST(
  request: NextRequest
) {
  try {
    const { walletAddress, action, electionId, electionContractAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    if (!action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json(
        { error: 'Action must be either approve or reject' },
        { status: 400 }
      )
    }

    // Require electionId and electionContractAddress when approving
    if (action === 'approve' && (!electionId || !electionContractAddress)) {
      return NextResponse.json(
        { error: 'Election ID and contract address are required for approval' },
        { status: 400 }
      )
    }

    // Get the decrypted wallet address for sending ETH (if approving)
    let recipientAddress: string | null = null
    if (action === 'approve') {
      try {
        recipientAddress = decryptAddress(walletAddress)
        console.log('Decrypted address for ETH transfer:', recipientAddress)
        
        if (!recipientAddress || !recipientAddress.startsWith('0x')) {
          console.error('Failed to decrypt address or invalid format:', recipientAddress)
          throw new Error('Invalid wallet address format')
        }
      } catch (error) {
        console.error('Error decrypting address:', error)
        return NextResponse.json(
          { error: 'Failed to decrypt wallet address' },
          { status: 500 }
        )
      }
    }

    const { db } = await connectToDatabase()
    
    // Find the voter by encrypted address
    const voter = await db.collection('voters').findOne({ 
      encryptedAddress: walletAddress 
    })
    
    if (!voter) {
      return NextResponse.json(
        { error: 'Voter not found' },
        { status: 404 }
      )
    }

    const now = new Date()
    
    // Create or update the election approval status
    const updateData: any = {
      // Only update overall status if we're not doing per-election approval
      ...(electionId ? {} : { status: action }),
    }
    
    // For per-election approval, add to electionApprovals array
    if (electionId) {
      // Each election approval entry will track: electionId, status, approvalDate, etc.
      const electionApproval = {
        electionId,
        status: action,
        contractAddress: electionContractAddress,
        isWhitelisted: action === 'approve',
        ...(action === 'approve' ? { approvedAt: now.toISOString() } : { rejectedAt: now.toISOString() })
      }
      
      // Check if this election is already in the approvals array
      const existingApproval = voter.electionApprovals?.find((a: any) => 
        a.electionId === electionId
      )
      
      if (existingApproval) {
        // Update existing approval
        updateData['electionApprovals.$[elem]'] = {
          ...existingApproval,
          ...electionApproval
        }
        
        await db.collection('voters').updateOne(
          { encryptedAddress: walletAddress },
          { $set: updateData },
          { 
            arrayFilters: [{ 'elem.electionId': electionId }]
          }
        )
      } else {
        // Add new approval
        updateData.$push = { electionApprovals: electionApproval }
        
        await db.collection('voters').updateOne(
          { encryptedAddress: walletAddress },
          updateData
        )
      }
      
      // Also update the overall status based on the total approvals/rejections
      const updatedVoter = await db.collection('voters').findOne({ 
        encryptedAddress: walletAddress 
      })
      
      if (updatedVoter && updatedVoter.electionApprovals?.length > 0) {
        const hasApprovals = updatedVoter.electionApprovals.some((a: any) => a.status === 'approved')
        
        // If the voter has at least one approval, mark them as approved overall
        // This is just for the global status indicator
        if (hasApprovals && updatedVoter.status !== 'approved') {
          await db.collection('voters').updateOne(
            { encryptedAddress: walletAddress },
            { $set: { status: 'approved' } }
          )
        }
      }
    } else {
      // Legacy non-election-specific approval (update only overall status)
      await db.collection('voters').updateOne(
        { encryptedAddress: walletAddress },
        { $set: updateData }
      )
    }

    // If approving, send some ETH for gas
    if (action === 'approve' && recipientAddress) {
      try {
        // Send a small amount of ETH to cover gas fees (adjust as needed)
        // In production, this should check if they already have ETH
        console.log(`Sending ETH to ${recipientAddress}...`)
        
        // Simulate blockchain interaction for now
        const txHash = await sendEth(recipientAddress as `0x${string}`, '0.001')
        
        if (txHash) {
          // Record the transaction in the database
          await db.collection('voters').updateOne(
            { encryptedAddress: walletAddress },
            { 
              $set: { 
                ethTxHash: txHash,
                ethSentAt: now.toISOString()
              },
              ...(electionId ? {
                $set: { "electionApprovals.$[elem].ethTxHash": txHash }
              } : {})
            },
            ...(electionId ? {
              arrayFilters: [{ "elem.electionId": electionId }]
            } : {})
          )
          
          console.log(`ETH sent to ${recipientAddress}, tx: ${txHash}`)
        }
      } catch (ethError) {
        // Log but continue - the voter is still approved even if ETH sending fails
        console.error('Error sending ETH:', ethError)
      }
    }

    return NextResponse.json({ success: true, action, electionId })
  } catch (error) {
    console.error('Error in voter approval API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 