/**
 * This file contains Arweave integration functions for the mines game
 * For demo purposes, this uses a mock implementation that simulates transactions
 * No real Arweave transactions are made
 */

import Arweave from 'arweave';
import { SmartWeaveNodeFactory } from 'redstone-smartweave';

// Initialize Arweave client
const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

// Contract ID for the mines game (this can be the local test ID)
const MINES_GAME_CONTRACT_ID = process.env.NEXT_PUBLIC_MINES_CONTRACT_ID || 'kHWu_t4g9PFA2u_V9_w-JF8PjbH0YX-3e6WAvWhB2T0';

// Store for mock data
const mockGameStore = new Map();
let mockUserAddress = '';

/**
 * Places a bet (mock implementation for demo)
 * @param amount Bet amount in AR
 * @param minesCount Number of mines
 * @returns Transaction ID and game ID
 */
export async function placeBet(amount: string, minesCount: number): Promise<{ txId: string, gameId: string }> {
  try {
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
  } catch (error) {
    console.error('Error in mock placeBet:', error);
    throw error;
  }
}

/**
 * Claims winnings (mock implementation for demo)
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
  } catch (error) {
    console.error('Error in mock claimWinnings:', error);
    throw error;
  }
}

/**
 * Fetches game history (mock implementation for demo)
 * @param address Wallet address (ignored in mock)
 * @returns Array of game history items
 */
export async function fetchGameHistory(address: string): Promise<any[]> {
  try {
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
  } catch (error) {
    console.error('Error in mock fetchGameHistory:', error);
    return [];
  }
}

/**
 * Fetches user balance (mock implementation for demo)
 * @param address Wallet address (ignored in mock)
 * @returns Balance in AR
 */
export async function fetchArweaveBalance(address: string): Promise<string> {
  // Return a mock balance
  return '100.0';
}

/**
 * Helper function to generate random mine positions
 * @param totalTiles Total number of tiles
 * @param minesCount Number of mines
 * @returns Array of mine positions
 */
function generateRandomMinePositions(totalTiles: number, minesCount: number): number[] {
  const positions = [];
  while (positions.length < minesCount) {
    const position = Math.floor(Math.random() * totalTiles);
    if (!positions.includes(position)) {
      positions.push(position);
    }
  }
  return positions;
}

// Add mock wallet type definition for TypeScript
declare global {
  interface Window {
    arweaveWallet?: {
      connect: (permissions: string[]) => Promise<void>;
      disconnect: () => Promise<void>;
      getActiveAddress: () => Promise<string>;
      sign: (transaction: any) => Promise<any>;
    };
  }
}
