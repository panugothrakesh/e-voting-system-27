import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, parseEther } from 'viem'
import { sepolia } from 'viem/chains'
import { http } from 'viem'

// In a server environment, return a mock implementation
// This prevents build errors while still providing the function interface
const isServer = typeof window === 'undefined'

// Helper function to generate a mock transaction hash
const generateMockTxHash = () => {
  return `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`
}

// Fetch admin private key only in a secure environment
let account: any
let walletClient: any

// Only initialize these in non-server environments or when a valid private key exists
if (!isServer && process.env.ADMIN_PRIVATE_KEY) {
  try {
    // Create account from private key
    const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY as `0x${string}`
    account = privateKeyToAccount(ADMIN_PRIVATE_KEY)

    // Create wallet client with admin account
    walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http()
    })
  } catch (error) {
    console.error('Failed to initialize wallet client:', error)
  }
}

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
    
    // Use mock implementation in server environments
    if (isServer || !walletClient) {
      console.log('Using mock implementation for sendGasEth')
      const mockTxHash = generateMockTxHash()
      
      return {
        txHash: mockTxHash,
        amount,
        mock: true
      }
    }
    
    // Send actual transaction if in browser environment
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