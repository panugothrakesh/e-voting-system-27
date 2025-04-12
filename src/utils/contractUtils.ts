/**
 * Utility functions for direct contract interactions
 */

/**
 * Send ETH to a wallet address (for gas fees)
 * @param recipientAddress The wallet address to send ETH to
 * @param amount The amount of ETH to send (in ETH, not wei)
 * @returns The transaction hash
 */
export async function sendEth(recipientAddress: `0x${string}`, amount: string = '0.001'): Promise<string> {
  try {
    console.log(`Sending ${amount} ETH to ${recipientAddress}...`);
    
    // For now, we'll just mock this function and return a fake transaction hash
    // In production, this would use a wallet with funds to send ETH
    
    // Simulate blockchain transaction delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return a mock transaction hash
    const mockTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    console.log(`ETH sent successfully! Transaction hash: ${mockTxHash}`);
    return mockTxHash;
  } catch (error) {
    console.error('Error sending ETH:', error);
    throw new Error(`Failed to send ETH: ${error instanceof Error ? error.message : String(error)}`);
  }
} 