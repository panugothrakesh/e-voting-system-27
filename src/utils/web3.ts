import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, parseEther } from 'viem'
import { sepolia } from 'viem/chains'
import { custom } from 'viem'

// Get admin private key from environment variable
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || ''

// Create account from private key
const account = privateKeyToAccount(ADMIN_PRIVATE_KEY as `0x${string}`)

// Create wallet client with admin account
const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: custom(window.ethereum),
})

/**
 * Send a small amount of ETH to a user address for gas fees
 * @param {string} to - The recipient address
 * @param {string} amount - The amount to send in ETH (e.g., "0.01")
 * @returns {Promise<{ txHash: string }>} The transaction hash
 */
export async function sendGasEth(to: string, amount: string = "0.0001") {
  try {
    console.log(`Sending ${amount} ETH to ${to}`)
    
    // Validate address format
    if (!to || !to.startsWith('0x') || to.length !== 42) {
      throw new Error('Invalid Ethereum address')
    }
    
    // Send transaction
    const txHash = await walletClient.sendTransaction({
      to: to as `0x${string}`,
      value: parseEther(amount),
    })
    
    console.log(`Transaction sent: ${txHash}`)
    
    return {
      txHash: txHash,
      amount
    }
  } catch (error) {
    console.error('Error sending ETH:', error)
    throw error
  }
} 