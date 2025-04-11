/**
 * This file contains a mock implementation of AO randomness for demo purposes
 * No real AO or Arweave interactions are made
 */

/**
 * Generates random mine positions (mock implementation)
 * @param totalTiles Total number of tiles in the game
 * @param minesCount Number of mines to place
 * @returns Array of mine positions
 */
export async function generateMines(totalTiles: number, minesCount: number): Promise<number[]> {
  return generateLocalRandomness(totalTiles, minesCount);
}

/**
 * Generates random positions locally
 * @param totalTiles Total number of tiles
 * @param count Number of random positions to generate
 * @returns Array of random positions
 */
function generateLocalRandomness(totalTiles: number, count: number): Array<number> {
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

  return Array.from(positions);
}

/**
 * Verifies a game result (mock implementation)
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
  // Local verification - no interaction with AO
  return revealedPositions.every(pos => !minePositions.includes(pos));
}
