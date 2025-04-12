/**
 * This file contains the AO process integration for randomness in the mines game
 */

import { createDataItemSigner, message } from '@permaweb/aoconnect';

// Get the AO Process ID from environment variables
const AO_PROCESS_ID = process.env.NEXT_PUBLIC_AO_PROCESS_ID;

// Define the type that exists in the arweave-integration.ts file
interface ArweaveWallet {
  connect: (permissions: string[]) => Promise<void>;
  disconnect: () => Promise<void>;
  getActiveAddress: () => Promise<string>;
  sign: (transaction: any) => Promise<any>;
  dispatch: (transaction: any) => Promise<{ id: string }>;
}

// Define the expected response structure from AO message calls
interface AOMessageResponse {
  Messages: Array<{
    Data: string;
    Tags: Array<{ name: string; value: string }>;
  }>;
}

/**
 * Generates random mine positions using AO process
 * @param totalTiles Total number of tiles in the game
 * @param minesCount Number of mines to place
 * @returns Array of mine positions
 */
export async function generateMines(totalTiles: number, minesCount: number): Promise<number[]> {
  // If no process ID is configured, fall back to local randomness
  if (!AO_PROCESS_ID) {
    console.warn('AO_PROCESS_ID not configured. Using local randomness as fallback.');
    return generateLocalRandomness(totalTiles, minesCount);
  }

  console.log(`Requesting randomness from AO process (ID: ${AO_PROCESS_ID})...`);
  console.log(`Parameters: totalTiles=${totalTiles}, minesCount=${minesCount}`);

  try {
    // Get wallet interface for signing (if available)
    const wallet = typeof window !== 'undefined' ? 
      (window.wander || window.arweaveWallet) : null;
    
    if (!wallet) {
      console.warn('No wallet detected for signing AO messages. This may affect functionality.');
    } else {
      console.log('Wallet found for signing AO messages.');
    }
    
    // Create a data item signer if we have a wallet
    const signer = wallet ? createDataItemSigner(wallet) : undefined;
    
    // Generate a unique game ID
    const gameId = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9);
    console.log(`Generated game ID: ${gameId}`);
    
    // Prepare the message to the AO process
    const result = await message({
      process: AO_PROCESS_ID,
      tags: [
        { name: 'Action', value: 'GetRandomness' },
        { name: 'Range', value: totalTiles.toString() },
        { name: 'Count', value: minesCount.toString() },
        { name: 'GameId', value: gameId }
      ],
      signer
    });

    console.log('Received response from AO process:', result);

    // Parse the response - we need to handle different response formats
    let responseData;
    try {
      // First try treating it as a string response
      if (typeof result === 'string') {
        responseData = JSON.parse(result);
        console.log('Parsed string response:', responseData);
      }
      // Then try accessing the first message if it's an object with Messages array
      else if (result && typeof result === 'object') {
        // Use type assertion to bypass TypeScript's strict checking
        const resultObj = result as any;
        if (resultObj.Messages && Array.isArray(resultObj.Messages) && resultObj.Messages.length > 0) {
          responseData = JSON.parse(resultObj.Messages[0].Data);
          console.log('Parsed Messages[0].Data response:', responseData);
        }
      }
      
      if (!responseData || !responseData.success) {
        throw new Error((responseData && responseData.error) || 'Failed to get randomness from AO process');
      }
      
      console.log('Successfully obtained randomness from AO process. Positions:', responseData.positions);
      return responseData.positions;
    } catch (parseError) {
      console.error('Error parsing AO process response:', parseError);
      throw new Error('Invalid response from AO process');
    }
  } catch (error) {
    console.error('Error getting randomness from AO process:', error);
    
    // Fall back to local randomness if AO process call fails
    console.warn('Falling back to local randomness due to AO process error');
    return generateLocalRandomness(totalTiles, minesCount);
  }
}

/**
 * Generates random positions locally (fallback method)
 * @param totalTiles Total number of tiles
 * @param count Number of random positions to generate
 * @returns Array of random positions
 */
function generateLocalRandomness(totalTiles: number, count: number): Array<number> {
  console.log(`Using local randomness fallback. totalTiles=${totalTiles}, count=${count}`);
  
  const positions = new Set<number>();
  
  // Use a cryptographically secure random number generator if available
  const getRandomValue = () => {
    if (typeof window !== 'undefined' && window.crypto) {
      // Generate random values using Web Crypto API
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] / 4294967296; // Convert to number between 0 and 1
    } else {
      // Fallback to Math.random
      return Math.random();
    }
  };

  while (positions.size < count) {
    const randomPosition = Math.floor(getRandomValue() * totalTiles);
    positions.add(randomPosition);
  }

  const result = Array.from(positions);
  console.log('Generated local random positions:', result);
  return result;
}

/**
 * Verifies a game result using AO process
 * @param gameId Game ID
 * @param minePositions Array of mine positions
 * @param revealedPositions Array of revealed positions
 * @returns Boolean indicating if the game result is valid
 */
export async function verifyGameResult(
  gameId: string,
  minePositions: number[],
  revealedPositions: number[]
): Promise<boolean> {
  // If no process ID is configured, fall back to local verification
  if (!AO_PROCESS_ID) {
    console.warn('AO_PROCESS_ID not configured. Using local verification as fallback.');
    return localVerifyResult(minePositions, revealedPositions);
  }

  console.log(`Verifying game result with AO process (ID: ${AO_PROCESS_ID})...`);
  console.log(`GameId: ${gameId}, RevealedPositions: ${revealedPositions.join(',')}`);

  try {
    // Get wallet interface for signing
    const wallet = typeof window !== 'undefined' ? 
      (window.wander || window.arweaveWallet) : null;
    
    // Create a data item signer if we have a wallet
    const signer = wallet ? createDataItemSigner(wallet) : undefined;

    // Prepare the message to the AO process
    const result = await message({
      process: AO_PROCESS_ID,
      tags: [
        { name: 'Action', value: 'VerifyGameResult' },
        { name: 'GameId', value: gameId }
      ],
      data: JSON.stringify({ revealedPositions }),
      signer
    });

    console.log('Received verification response from AO process:', result);

    // Parse the response - we need to handle different response formats
    let responseData;
    try {
      // First try treating it as a string response
      if (typeof result === 'string') {
        responseData = JSON.parse(result);
        console.log('Parsed string verification response:', responseData);
      }
      // Then try accessing the first message if it's an object with Messages array
      else if (result && typeof result === 'object') {
        // Use type assertion to bypass TypeScript's strict checking
        const resultObj = result as any;
        if (resultObj.Messages && Array.isArray(resultObj.Messages) && resultObj.Messages.length > 0) {
          responseData = JSON.parse(resultObj.Messages[0].Data);
          console.log('Parsed Messages[0].Data verification response:', responseData);
        }
      }
      
      if (!responseData || !responseData.success) {
        throw new Error((responseData && responseData.error) || 'Failed to verify game result with AO process');
      }
      
      console.log(`Game result verification: ${responseData.isValid ? 'VALID' : 'INVALID'}`);
      return responseData.isValid;
    } catch (parseError) {
      console.error('Error parsing AO process verification response:', parseError);
      throw new Error('Invalid response from AO process');
    }
  } catch (error) {
    console.error('Error verifying game result with AO process:', error);
    
    // Fall back to local verification if AO process call fails
    console.warn('Falling back to local verification due to AO process error');
    return localVerifyResult(minePositions, revealedPositions);
  }
}

/**
 * Local verification function (fallback method)
 * @param minePositions Array of mine positions
 * @param revealedPositions Array of revealed positions
 * @returns Boolean indicating if no revealed position contains a mine
 */
function localVerifyResult(
  minePositions: number[],
  revealedPositions: number[]
): boolean {
  console.log(`Using local verification. MinePositions: ${minePositions.join(',')}, RevealedPositions: ${revealedPositions.join(',')}`);
  const result = revealedPositions.every(pos => !minePositions.includes(pos));
  console.log(`Local verification result: ${result ? 'VALID' : 'INVALID'}`);
  return result;
}
