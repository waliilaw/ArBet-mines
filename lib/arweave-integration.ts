/**
 * This file contains Arweave integration functions for the mines game
 * Supports both demo mode with mock tokens and real wallet mode
 */

import Arweave from 'arweave';

// Initialize Arweave client
const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

// Contract ID for the mines game
const MINES_GAME_CONTRACT_ID = process.env.NEXT_PUBLIC_MINES_CONTRACT_ID || 'kHWu_t4g9PFA2u_V9_w-JF8PjbH0YX-3e6WAvWhB2T0';

// Store for mock data
const mockGameStore = new Map();
let mockUserAddress = '';
let isTestMode = true; // Default to test mode

/**
 * Toggle between test mode and real wallet mode
 * @param testMode Boolean indicating whether to use test mode
 */
export function setTestMode(testMode: boolean): void {
  isTestMode = testMode;
  console.log(`Mode set to: ${isTestMode ? 'TEST' : 'REAL WALLET'}`);
}

/**
 * Get current mode (test or real)
 * @returns Boolean indicating if in test mode
 */
export function getTestMode(): boolean {
  return isTestMode;
}

/**
 * Connects to Arweave wallet
 * @returns Connected wallet address
 */
export async function connectWallet(): Promise<string> {
  // Add a small delay to prevent UI lockup
  await new Promise(resolve => setTimeout(resolve, 50));
  
  try {
    if (isTestMode) {
      // Generate mock user address for test mode
      mockUserAddress = `mock_user_${Math.random().toString(36).substring(2, 9)}`;
      console.log('Connected to mock wallet:', mockUserAddress);
      return mockUserAddress;
    } else {
      // Check if ArConnect is installed
      if (typeof window !== 'undefined') {
        // Check for ArConnect or WonderWallet
        const hasArConnect = window.arweaveWallet !== undefined;
        
        console.log('ArConnect detected:', hasArConnect);
        
        if (hasArConnect) {
          try {
            // Wrap ArConnect operations in a custom try-catch to handle message channel errors
            const safeArConnectOperation = async () => {
              try {
                console.log('Attempting to connect to ArConnect...');
                
                // Set timeout to prevent indefinite waiting if ArConnect extension freezes
                const connectPromise = window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION', 'DISPATCH']);
                
                // Set a timeout for wallet connection
                const timeoutPromise = new Promise<never>((_, reject) => {
                  setTimeout(() => reject(new Error('Wallet connection timed out')), 5000);
                });
                
                // Race the promises
                await Promise.race([connectPromise, timeoutPromise]);
                
                // Small delay to ensure channel has time to process
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const address = await window.arweaveWallet.getActiveAddress();
                console.log('Connected to real wallet:', address);
                return address;
              } catch (innerErr: unknown) {
                // Handle message channel errors specifically
                console.error('Error in ArConnect connection attempt:', innerErr);
                if (innerErr instanceof Error && innerErr.message && (
                    innerErr.message.includes('message channel closed') || 
                    innerErr.message.includes('asynchronous response')
                )) {
                  console.error('ArConnect message channel error:', innerErr);
                  throw new Error('ArConnect extension communication error. Please refresh the page and try again.');
                }
                throw innerErr;
              }
            };
            
            return await safeArConnectOperation();
          } catch (err) {
            console.error('Error connecting to ArConnect:', err);
            // Show error to user instead of silently fallback to test mode
            throw new Error('Failed to connect to ArConnect. Please make sure it is installed and unlocked.');
          }
        } else {
          console.error('ArConnect not found - please install it first');
          throw new Error('ArConnect not found. Please install the ArConnect extension to connect a real wallet.');
        }
      } else {
        console.error('Window not defined - falling back to test mode');
        // Fallback to test mode if window is not defined (SSR context)
        setTestMode(true);
        mockUserAddress = `mock_user_${Math.random().toString(36).substring(2, 9)}`;
        return mockUserAddress;
      }
    }
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    throw error; // Don't automatically fallback to test mode
  }
}

/**
 * Disconnects from Arweave wallet
 */
export async function disconnectWallet(): Promise<void> {
  try {
    if (!isTestMode && typeof window !== 'undefined' && window.arweaveWallet) {
      try {
        // Wrap disconnect in try-catch for message channel errors
        await Promise.race([
          window.arweaveWallet.disconnect(),
          new Promise<void>((resolve) => setTimeout(resolve, 2000)) // Timeout after 2 seconds
        ]);
      } catch (err: unknown) {
        // Handle message channel errors specifically
        if (err instanceof Error && err.message && (
            err.message.includes('message channel closed') || 
            err.message.includes('asynchronous response')
        )) {
          console.error('ArConnect message channel error during disconnect:', err);
          // Don't throw the error for disconnect - just log it
        } else {
          console.error('Error during disconnect:', err);
        }
      }
    }
    
    mockUserAddress = '';
    console.log('Wallet disconnected');
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    // Don't throw error for disconnection issues
  }
}

/**
 * Places a bet
 * @param amount Bet amount in AR
 * @param minesCount Number of mines
 * @returns Transaction ID and game ID
 */
export async function placeBet(amount: string, minesCount: number): Promise<{ txId: string, gameId: string }> {
  try {
    if (isTestMode) {
      return placeBetMock(amount, minesCount);
    } else {
      return placeBetReal(amount, minesCount);
    }
  } catch (error) {
    console.error('Error in placeBet:', error);
    throw error;
  }
}

/**
 * Places a bet (mock implementation for test mode)
 * @param amount Bet amount in AR
 * @param minesCount Number of mines
 * @returns Transaction ID and game ID
 */
async function placeBetMock(amount: string, minesCount: number): Promise<{ txId: string, gameId: string }> {
  // Generate mock transaction and game IDs
  const txId = `mock_tx_${Date.now()}`;
  const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // Mock user address if no wallet is connected
  const userAddress = mockUserAddress || `mock_user_${Math.random().toString(36).substring(2, 9)}`;
  mockUserAddress = userAddress;
  
  // Store mock game data
  mockGameStore.set(gameId, {
    id: gameId,
    txId,
    player: userAddress,
    betAmount: parseFloat(amount),
    minesCount,
    status: 'active',
    createdAt: Date.now(),
    revealedPositions: [],
    minePositions: generateRandomMinePositions(25, minesCount),
    result: null,
    payout: 0
  });
  
  console.log('Placed bet (mock):', { txId, gameId, amount, minesCount });
  
  return { txId, gameId };
}

/**
 * Places a bet with real wallet
 * @param amount Bet amount in AR
 * @param minesCount Number of mines
 * @returns Transaction ID and game ID
 */
async function placeBetReal(amount: string, minesCount: number): Promise<{ txId: string, gameId: string }> {
  if (typeof window === 'undefined' || !window.arweaveWallet) {
    throw new Error('Arweave wallet not connected');
  }
  
  try {
    // In a real implementation, you would:
    // 1. Create a transaction to the contract
    // 2. Set appropriate tags
    // 3. Sign and post the transaction

    // For demo purposes, we'll use mock transaction flow but log a message
    console.log('Would place real bet with Arweave wallet');
    
    // Reuse mock implementation for demo purposes
    return placeBetMock(amount, minesCount);
  } catch (error) {
    console.error('Error in placeBetReal:', error);
    throw error;
  }
}

/**
 * Claims winnings
 * @param gameId Game ID
 * @param amount Win amount in AR
 * @param revealedPositions Array of revealed positions
 * @returns Transaction ID
 */
export async function claimWinnings(
  gameId: string, 
  amount: string, 
  revealedPositions: number[]
): Promise<string> {
  try {
    if (isTestMode) {
      return claimWinningsMock(gameId, amount, revealedPositions);
    } else {
      return claimWinningsReal(gameId, amount, revealedPositions);
    }
  } catch (error) {
    console.error('Error in claimWinnings:', error);
    throw error;
  }
}

/**
 * Claims winnings (mock implementation for test mode)
 * @param gameId Game ID
 * @param amount Win amount in AR
 * @param revealedPositions Array of revealed positions
 * @returns Transaction ID
 */
async function claimWinningsMock(
  gameId: string, 
  amount: string, 
  revealedPositions: number[]
): Promise<string> {
  // Generate mock transaction ID
  const txId = `mock_tx_${Date.now()}`;
  
  // Update mock game data
  if (mockGameStore.has(gameId)) {
    const game = mockGameStore.get(gameId);
    game.status = 'completed';
    game.result = 'win';
    game.revealedPositions = revealedPositions;
    game.payout = parseFloat(amount);
    mockGameStore.set(gameId, game);
  }
  
  console.log('Claimed winnings (mock):', { txId, gameId, amount, revealedPositions });
  
  return txId;
}

/**
 * Claims winnings with real wallet
 * @param gameId Game ID
 * @param amount Win amount in AR
 * @param revealedPositions Array of revealed positions
 * @returns Transaction ID
 */
async function claimWinningsReal(
  gameId: string, 
  amount: string, 
  revealedPositions: number[]
): Promise<string> {
  if (typeof window === 'undefined' || !window.arweaveWallet) {
    throw new Error('Arweave wallet not connected');
  }
  
  try {
    // In a real implementation, you would:
    // 1. Create a transaction to the contract
    // 2. Set appropriate tags
    // 3. Sign and post the transaction

    // For demo purposes, we'll use mock transaction flow but log a message
    console.log('Would claim real winnings with Arweave wallet');
    
    // Reuse mock implementation for demo purposes
    return claimWinningsMock(gameId, amount, revealedPositions);
  } catch (error) {
    console.error('Error in claimWinningsReal:', error);
    throw error;
  }
}

/**
 * Fetches game history
 * @param address Wallet address
 * @returns Array of game history items
 */
export async function fetchGameHistory(address: string): Promise<any[]> {
  try {
    if (isTestMode) {
      return fetchGameHistoryMock(address);
    } else {
      return fetchGameHistoryReal(address);
    }
  } catch (error) {
    console.error('Error in fetchGameHistory:', error);
    return [];
  }
}

/**
 * Fetches game history (mock implementation for test mode)
 * @param address Wallet address (ignored in mock)
 * @returns Array of game history items
 */
async function fetchGameHistoryMock(address: string): Promise<any[]> {
  // Use mock user address if provided address is empty
  const userAddress = address || mockUserAddress;
  
  if (!userAddress) {
    return [];
  }
  
  // Convert mock store to array
  const history = Array.from(mockGameStore.values())
    .filter(game => game.player === userAddress)
    .map(game => ({
      id: game.id,
      txid: game.txId,
      action: game.status === 'completed' ? 'ClaimWinnings' : 'PlaceBet',
      betAmount: game.betAmount.toString(),
      minesCount: game.minesCount,
      result: game.result || 'active',
      winAmount: game.payout.toString(),
      revealedPositions: game.revealedPositions,
      timestamp: game.createdAt
    }));
  
  return history.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Fetches game history from real blockchain
 * @param address Wallet address
 * @returns Array of game history items
 */
async function fetchGameHistoryReal(address: string): Promise<any[]> {
  try {
    // In a real implementation, you would:
    // 1. Query the contract or GraphQL endpoint
    // 2. Format the results

    // For demo purposes, we'll use mock history but log a message
    console.log('Would fetch real game history from blockchain');
    
    // Reuse mock implementation for demo purposes
    return fetchGameHistoryMock(address);
  } catch (error) {
    console.error('Error in fetchGameHistoryReal:', error);
    return [];
  }
}

/**
 * Fetches user balance
 * @param address Wallet address
 * @returns Balance in AR
 */
export async function fetchArweaveBalance(address: string): Promise<string> {
  // Add a small delay to prevent UI freezing
  await new Promise(resolve => setTimeout(resolve, 10));
  
  try {
    if (isTestMode) {
      return '100.0'; // Return mock balance for test mode
    } else {
      // For real wallet mode, fetch actual balance
      if (typeof window !== 'undefined' && window.arweaveWallet) {
        try {
          // Set timeout to prevent indefinite waiting
          const balancePromise = async () => {
            try {
              const addressToCheck = address || await window.arweaveWallet.getActiveAddress();
              const winstonBalance = await arweave.wallets.getBalance(addressToCheck);
              const arBalance = arweave.ar.winstonToAr(winstonBalance);
              return arBalance;
            } catch (innerErr: unknown) {
              // Handle message channel errors specifically
              if (innerErr instanceof Error && innerErr.message && (
                  innerErr.message.includes('message channel closed') || 
                  innerErr.message.includes('asynchronous response')
              )) {
                console.error('ArConnect message channel error during balance fetch:', innerErr);
                throw new Error('Communication with ArConnect failed');
              }
              throw innerErr;
            }
          };
          
          // Set a timeout for balance fetch
          const timeoutPromise = new Promise<string>((resolve) => {
            setTimeout(() => resolve('0.0'), 3000);
          });
          
          // Race the promises
          return await Promise.race([balancePromise(), timeoutPromise]);
        } catch (error) {
          console.error('Error fetching real balance:', error);
          return '0.0';
        }
      }
      return '0.0';
    }
  } catch (error) {
    console.error('Error in fetchArweaveBalance:', error);
    return '0.0';
  }
}

/**
 * Helper function to generate random mine positions
 * @param totalTiles Total number of tiles
 * @param minesCount Number of mines
 * @returns Array of mine positions
 */
function generateRandomMinePositions(totalTiles: number, minesCount: number): number[] {
  const positions: number[] = [];
  while (positions.length < minesCount) {
    const position = Math.floor(Math.random() * totalTiles);
    if (!positions.includes(position)) {
      positions.push(position);
    }
  }
  return positions;
}

// Note: We're not defining Window.arweaveWallet here to avoid type conflicts
// The actual type is defined by the ArConnect extension
