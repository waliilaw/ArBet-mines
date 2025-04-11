/**
 * SmartWeave contract for the Mines Game
 * This contract handles the game logic, betting, and payouts
 */

/**
 * Initial state function
 * Returns the initial state of the contract when deployed
 */
export function handle(state, action) {
  const input = action.input;
  const caller = action.caller;

  if (input.function === 'placeBet') {
    return placeBet(state, caller, input);
  }

  if (input.function === 'claimWinnings') {
    return claimWinnings(state, caller, input);
  }

  if (input.function === 'getGameState') {
    return getGameState(state, caller, input);
  }

  throw new ContractError(`Function '${input.function}' not found`);
}

/**
 * Function to place a bet
 * @param {Object} state - Current contract state
 * @param {String} caller - Caller address
 * @param {Object} input - Function input parameters
 * @returns {Object} - Updated state
 */
function placeBet(state, caller, input) {
  // Validate input
  if (!input.betAmount || typeof input.betAmount !== 'number' || input.betAmount <= 0) {
    throw new ContractError('Invalid bet amount');
  }

  if (!input.minesCount || typeof input.minesCount !== 'number' || input.minesCount <= 0 || input.minesCount >= 24) {
    throw new ContractError('Invalid mines count');
  }

  // Validate transaction value
  const txValue = SmartWeave.transaction.quantity;
  const txValueInAr = SmartWeave.transaction.quantity ? SmartWeave.transaction.quantity : 0;
  
  if (txValueInAr <= 0) {
    throw new ContractError('No AR tokens sent with the transaction');
  }

  // Generate a unique game ID
  const gameId = `${SmartWeave.transaction.id}_${Date.now()}`;

  // Create a new game entry
  const newGame = {
    id: gameId,
    player: caller,
    betAmount: input.betAmount,
    minesCount: input.minesCount,
    status: 'active',
    createdAt: SmartWeave.block.height,
    timestamp: input.timestamp || Date.now(),
    initialMultiplier: calculateMultiplier(0, 25, input.minesCount),
    minePositions: [], // This will be populated via AO
    revealedPositions: [],
    result: null,
    payout: 0
  };

  // Update state
  const games = state.games || {};
  games[gameId] = newGame;

  return {
    ...state,
    games,
    totalBets: (state.totalBets || 0) + 1,
    totalBetAmount: (state.totalBetAmount || 0) + input.betAmount
  };
}

/**
 * Function to claim winnings from a game
 * @param {Object} state - Current contract state
 * @param {String} caller - Caller address
 * @param {Object} input - Function input parameters
 * @returns {Object} - Updated state
 */
function claimWinnings(state, caller, input) {
  // Validate input
  if (!input.gameId) {
    throw new ContractError('Game ID is required');
  }
  
  if (!input.revealedPositions || !Array.isArray(input.revealedPositions)) {
    throw new ContractError('Revealed positions are required');
  }
  
  // Get the game
  const games = state.games || {};
  const game = games[input.gameId];
  
  if (!game) {
    throw new ContractError('Game not found');
  }
  
  if (game.player !== caller) {
    throw new ContractError('Only the player can claim winnings');
  }
  
  if (game.status !== 'active') {
    throw new ContractError('Game is not active');
  }
  
  // Update revealed positions
  const revealedPositions = [...game.revealedPositions, ...input.revealedPositions];
  
  // Calculate winnings
  const multiplier = calculateMultiplier(revealedPositions.length, 25, game.minesCount);
  const winAmount = game.betAmount * multiplier;
  
  // Update game status
  game.revealedPositions = revealedPositions;
  game.status = 'completed';
  game.result = 'win';
  game.payout = winAmount;
  game.multiplier = multiplier;
  
  // Update contract stats
  const totalPayout = (state.totalPayout || 0) + winAmount;
  
  // Return the new state
  return {
    ...state,
    games,
    totalPayout
  };
}

/**
 * Function to get a game state
 * @param {Object} state - Current contract state
 * @param {String} caller - Caller address
 * @param {Object} input - Function input parameters
 * @returns {Object} - Game state
 */
function getGameState(state, caller, input) {
  // Validate input
  if (!input.gameId) {
    throw new ContractError('Game ID is required');
  }
  
  // Get the game
  const games = state.games || {};
  const game = games[input.gameId];
  
  if (!game) {
    throw new ContractError('Game not found');
  }
  
  // Return the game state
  return {
    result: {
      game
    }
  };
}

/**
 * Calculate the multiplier based on the number of revealed tiles
 * @param {Number} revealed - Number of revealed tiles
 * @param {Number} totalTiles - Total number of tiles
 * @param {Number} minesCount - Number of mines
 * @returns {Number} - Multiplier
 */
function calculateMultiplier(revealed, totalTiles, minesCount) {
  if (revealed === 0) return 1;

  const safeSquares = totalTiles - minesCount;
  let multiplier = 1;

  for (let i = 0; i < revealed; i++) {
    multiplier *= (safeSquares - i) / (totalTiles - i);
  }

  // Inverse the multiplier and apply house edge (3%)
  multiplier = 0.97 / multiplier;
  
  // Round to 2 decimal places
  return Math.round(multiplier * 100) / 100;
}

// Contract initialization
export function init(state) {
  return {
    owner: SmartWeave.transaction.owner,
    games: {},
    totalBets: 0,
    totalBetAmount: 0,
    totalPayout: 0,
    houseEdge: 0.03, // 3% house edge
    createdAt: SmartWeave.block.height
  };
} 