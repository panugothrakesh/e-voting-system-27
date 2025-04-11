import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { decryptAddress } from '@/utils/crypto'
import { ObjectId } from 'mongodb'
import { createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

// Environment variables for admin wallet
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || ''

// Create admin wallet account if private key is available
const getAdminAccount = () => {
  if (!ADMIN_PRIVATE_KEY) {
    console.warn('No admin private key available for blockchain interactions')
    return null
  }
  try {
    // Format the private key correctly - it should be 0x followed by 64 hex characters
    let formattedPrivateKey = ADMIN_PRIVATE_KEY
    
    // Remove 0x prefix if it exists
    if (formattedPrivateKey.startsWith('0x')) {
      formattedPrivateKey = formattedPrivateKey.substring(2)
    }
    
    // Ensure it's 64 characters (32 bytes)
    if (formattedPrivateKey.length !== 64) {
      console.error(`Invalid private key length: ${formattedPrivateKey.length} characters. Expected 64.`)
      return null
    }
    
    // Add 0x prefix back for privateKeyToAccount
    console.log('Creating admin account from private key')
    return privateKeyToAccount(`0x${formattedPrivateKey}`)
  } catch (error) {
    console.error('Error creating admin account:', error)
    return null
  }
}

// Function to send some ETH to the voter for gas fees
async function sendEthForGasFees(recipientAddress: string): Promise<{success: boolean, txHash?: string, error?: string}> {
  try {
    if (!ADMIN_PRIVATE_KEY) {
      console.warn('No admin private key set. Cannot send ETH for gas fees.')
      return { success: false, error: 'Admin wallet not configured' }
    }

    console.log(`Attempting to send ETH to approved voter: ${recipientAddress}`)
    
    const account = getAdminAccount()
    if (!account) {
      return { success: false, error: 'Failed to create admin account' }
    }
    
    // Use public RPC endpoints that don't require authentication
    const publicRpcEndpoints = [
      'https://eth-sepolia.public.blastapi.io',
      'https://sepolia.gateway.tenderly.co',
      'https://rpc.sepolia.org',
      'https://rpc2.sepolia.org'
    ]
    
    // Try each endpoint until one works
    let lastError = '';
    for (const rpcUrl of publicRpcEndpoints) {
      try {
        console.log(`Trying RPC endpoint: ${rpcUrl}`)
        const walletClient = createWalletClient({
          account,
          chain: sepolia,
          transport: http(rpcUrl)
        })
        
        // Send a small amount of ETH (0.001) for gas fees
        const txHash = await walletClient.sendTransaction({
          to: recipientAddress as `0x${string}`,
          value: parseEther('0.001')
        })
        
        console.log(`Successfully sent 0.001 ETH to ${recipientAddress}. Transaction hash: ${txHash}`)
        return { success: true, txHash: txHash }
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e)
        console.error(`Error with RPC ${rpcUrl}:`, lastError)
        // Continue to try next endpoint
      }
    }
    
    // If we get here, all RPC endpoints failed
    return { success: false, error: `All RPC endpoints failed. Last error: ${lastError}` }
  } catch (error) {
    console.error('Error sending ETH for gas fees:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error sending ETH' 
    }
  }
}

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
        
        // Send some ETH to the voter for gas fees
        if (decryptedAddress) {
          console.log(`Sending some Sepolia ETH to voter for gas fees: ${decryptedAddress}`);
          console.log(`Admin private key available: ${ADMIN_PRIVATE_KEY ? 'Yes (length: ' + ADMIN_PRIVATE_KEY.length + ')' : 'No'}`);
          
          const ethResult = await sendEthForGasFees(decryptedAddress);
          
          console.log(`ETH transfer result:`, {
            success: ethResult.success,
            txHash: ethResult.txHash || 'none',
            error: ethResult.error || 'none'
          });
          
          if (ethResult.success) {
            console.log(`Successfully sent ETH to voter. Tx hash: ${ethResult.txHash}`);
            // Add the transaction hash to the update data
            if (ethResult.txHash) {
              updateData.ethTxHash = ethResult.txHash;
            }
            blockchainStatus = 'success';
          } else {
            console.error(`Failed to send ETH to voter: ${ethResult.error}`);
            blockchainError = ethResult.error || 'Unknown error sending ETH';
            blockchainStatus = 'eth_transfer_failed';
          }
        }
        
      } catch (error) {
        console.error('Blockchain interaction would have failed:', error);
        blockchainStatus = 'simulated_failure';
        blockchainError = error instanceof Error ? error.message : String(error);
      }
    }

    // Update the voter's status in the database
    console.log('Updating voter status in database')
    
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
      blockchainError,
      ethSent: blockchainStatus === 'success',
      ethTxHash: updateData.ethTxHash || null
    })
  } catch (error) {
    console.error('Error in POST /api/admin/voters/approve:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 