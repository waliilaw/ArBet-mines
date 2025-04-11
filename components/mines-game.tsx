"use client"

import { useState, useEffect } from "react"
import { useArweaveWallet } from "@/hooks/use-arweave-wallet"
import { generateMines, verifyGameResult } from "@/lib/ao-randomness"
import { placeBet, claimWinnings, fetchArweaveBalance } from "@/lib/arweave-integration"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

// Game constants
const GRID_SIZE = 5
const TOTAL_TILES = GRID_SIZE * GRID_SIZE
const DEFAULT_MINES_COUNT = 5

// Game states
type GameState = "idle" | "playing" | "won" | "lost"

// Tile states
type TileState = "hidden" | "revealed" | "mine" | "diamond"

interface Tile {
  id: number
  state: TileState
  isMine: boolean
}

export default function MinesGame() {
  // Game state
  const [gameState, setGameState] = useState<GameState>("idle")
  const [tiles, setTiles] = useState<Tile[]>([])
  const [minesCount, setMinesCount] = useState(DEFAULT_MINES_COUNT)
  const [betAmount, setBetAmount] = useState("0.1")
  const [currentMultiplier, setCurrentMultiplier] = useState(1)
  const [revealedCount, setRevealedCount] = useState(0)
  const [isTestMode, setIsTestMode] = useState(false)
  const [minePositions, setMinePositions] = useState<number[]>([])
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [currentGameId, setCurrentGameId] = useState<string>("")

  // Arweave wallet integration
  const { connected, address, balance, connect, disconnect } = useArweaveWallet()

  // Initialize game board
  useEffect(() => {
    resetGame()
  }, [minesCount])

  // Fetch wallet balance when connected
  useEffect(() => {
    const updateBalance = async () => {
      if (connected && address) {
        try {
          await fetchArweaveBalance(address);
        } catch (error) {
          console.error("Error fetching balance:", error);
        }
      }
    };
    
    updateBalance();
  }, [connected, address]);

  // Calculate potential win based on revealed tiles and bet amount
  const calculateMultiplier = (revealed: number) => {
    if (revealed === 0) return 1

    const safeSquares = TOTAL_TILES - minesCount
    let multiplier = 1

    for (let i = 0; i < revealed; i++) {
      multiplier *= (safeSquares - i) / (TOTAL_TILES - i)
    }

    // Inverse the multiplier and apply house edge
    multiplier = 0.97 / multiplier
    return Number.parseFloat(multiplier.toFixed(2))
  }

  // Reset game to initial state
  const resetGame = async () => {
    const newTiles: Tile[] = Array.from({ length: TOTAL_TILES }, (_, id) => ({
      id,
      state: "hidden",
      isMine: false,
    }))

    setTiles(newTiles)
    setGameState("idle")
    setRevealedCount(0)
    setCurrentMultiplier(1)
    setMinePositions([])
    setCurrentGameId("")
  }

  // Start a new game
  const startGame = async () => {
    if (!connected && !isTestMode) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your Arweave wallet to play",
        variant: "destructive",
      })
      return
    }

    if (Number.parseFloat(betAmount) <= 0) {
      toast({
        title: "Invalid bet amount",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      })
      return
    }

    if (!isTestMode && Number.parseFloat(betAmount) > Number.parseFloat(balance)) {
      toast({
        title: "Insufficient balance",
        description: "Your bet amount exceeds your wallet balance",
        variant: "destructive",
      })
      return
    }

    try {
      setTransactionLoading(true);
      
      // Generate mine positions using AO randomness
      const mines = await generateMines(TOTAL_TILES, minesCount)
      setMinePositions(mines)

      // Create new tiles with mines
      const newTiles: Tile[] = Array.from({ length: TOTAL_TILES }, (_, id) => ({
        id,
        state: "hidden",
        isMine: mines.includes(id),
      }))

      setTiles(newTiles)
      setGameState("playing")
      setRevealedCount(0)
      setCurrentMultiplier(1)

      // Place bet on Arweave network
      if (!isTestMode) {
        try {
          const { txId, gameId } = await placeBet(betAmount, minesCount);
          setCurrentGameId(gameId);
          
          toast({
            title: "Bet placed successfully!",
            description: `Transaction ID: ${txId.substring(0, 8)}...`,
          });
        } catch (error) {
          console.error("Error placing bet:", error);
          toast({
            title: "Error placing bet",
            description: "There was an error placing your bet on Arweave",
            variant: "destructive",
          });
          // Reset the game since bet failed
          resetGame();
          return;
        }
      } else {
        // Generate mock game ID for test mode
        setCurrentGameId(`test_${Date.now()}`);
      }

      toast({
        title: "Game started!",
        description: `Placed bet: ${betAmount} AR with ${minesCount} mines`,
      })
    } catch (error) {
      console.error("Error starting game:", error);
      toast({
        title: "Error starting game",
        description: "There was an error starting the game",
        variant: "destructive",
      });
    } finally {
      setTransactionLoading(false);
    }
  }

  // Handle tile click
  const handleTileClick = async (tileId: number) => {
    if (gameState !== "playing") return

    const clickedTile = tiles[tileId]
    if (clickedTile.state !== "hidden") return

    if (clickedTile.isMine) {
      // Game over - hit a mine
      const updatedTiles: Tile[] = tiles.map((tile) => {
        if (tile.id === tileId) {
          return { ...tile, state: "mine" }
        } else if (tile.isMine) {
          return { ...tile, state: "mine" }
        }
        return tile
      })

      setTiles(updatedTiles)
      setGameState("lost")

      toast({
        title: "BOOM! You hit a mine!",
        description: `You lost ${betAmount} AR`,
        variant: "destructive",
      })
    } else {
      // Revealed a safe tile
      const newRevealedCount = revealedCount + 1
      setRevealedCount(newRevealedCount)

      const newMultiplier = calculateMultiplier(newRevealedCount)
      setCurrentMultiplier(newMultiplier)

      const updatedTiles: Tile[] = tiles.map((tile) => {
        if (tile.id === tileId) {
          return { ...tile, state: "diamond" }
        }
        return tile
      })

      setTiles(updatedTiles)

      // Check if all safe tiles are revealed
      const safeTiles = TOTAL_TILES - minesCount
      if (newRevealedCount === safeTiles) {
        setGameState("won")
        
        // Auto cashout on complete win
        if (!isTestMode && currentGameId) {
          try {
            const winAmount = (Number.parseFloat(betAmount) * newMultiplier).toFixed(4);
            const revealedPositions = updatedTiles
              .filter(tile => tile.state === "diamond")
              .map(tile => tile.id);
              
            await claimWinnings(currentGameId, winAmount, revealedPositions);
          } catch (error) {
            console.error("Error claiming complete win:", error);
          }
        }
        
        toast({
          title: "Congratulations!",
          description: `You revealed all safe tiles! You won ${(Number.parseFloat(betAmount) * newMultiplier).toFixed(4)} AR`,
        })
      }
    }
  }

  // Cash out current winnings
  const handleCashout = async () => {
    if (gameState !== "playing" || revealedCount === 0) return
    
    setTransactionLoading(true);
    
    try {
      const winAmount = (Number.parseFloat(betAmount) * currentMultiplier).toFixed(4);
      
      // Get the positions of revealed tiles
      const revealedPositions = tiles
        .filter(tile => tile.state === "diamond")
        .map(tile => tile.id);
      
      if (!isTestMode && currentGameId) {
        // Verify game result using AO
        const isValid = await verifyGameResult(currentGameId, minePositions, revealedPositions);
        
        if (isValid) {
          // Claim winnings on Arweave
          const txId = await claimWinnings(currentGameId, winAmount, revealedPositions);
          
          toast({
            title: "Cashed out successfully!",
            description: `You won ${winAmount} AR with a ${currentMultiplier}x multiplier!`,
          });
        } else {
          toast({
            title: "Verification failed",
            description: "Game result verification failed",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Test mode just shows toast
        toast({
          title: "Cashed out successfully!",
          description: `You won ${winAmount} AR with a ${currentMultiplier}x multiplier!`,
        });
      }

      // Reveal all mines
      const updatedTiles: Tile[] = tiles.map((tile) => {
        if (tile.isMine) {
          return { ...tile, state: "mine" }
        }
        return tile
      });

      setTiles(updatedTiles);
      setGameState("won");
      
    } catch (error) {
      console.error("Error cashing out:", error);
      toast({
        title: "Error cashing out",
        description: "There was an error processing your cashout",
        variant: "destructive",
      });
    } finally {
      setTransactionLoading(false);
    }
  }

  return (
    <div className="pixel-container bg-gray-800 p-6 rounded-lg border-4 border-gray-700 shadow-lg max-w-3xl w-full">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Game controls */}
        <div className="flex flex-col gap-4 w-full md:w-1/3">
          <div className="bg-gray-900 p-4 rounded-lg border-2 border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4 pixel-font">GAME SETTINGS</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="bet-amount" className="text-white mb-1 block">
                  Bet Amount (AR)
                </Label>
                <Input
                  id="bet-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={gameState === "playing" || transactionLoading}
                  className="bg-gray-700 text-white border-gray-600"
                />
              </div>

              <div>
                <Label htmlFor="mines-count" className="text-white mb-1 block">
                  Mines: {minesCount}
                </Label>
                <input
                  id="mines-count"
                  type="range"
                  min="1"
                  max="24"
                  value={minesCount}
                  onChange={(e) => setMinesCount(Number.parseInt(e.target.value))}
                  disabled={gameState === "playing" || transactionLoading}
                  className="w-full"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="test-mode"
                  checked={isTestMode}
                  onCheckedChange={setIsTestMode}
                  disabled={gameState === "playing" || transactionLoading}
                />
                <Label htmlFor="test-mode" className="text-white">
                  Test Mode
                </Label>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-lg border-2 border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4 pixel-font">GAME INFO</h2>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="text-white font-bold">
                  {transactionLoading 
                    ? "Processing..." 
                    : gameState === "idle"
                      ? "Ready"
                      : gameState === "playing"
                        ? "Playing"
                        : gameState === "won"
                          ? "Won"
                          : "Lost"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Multiplier:</span>
                <span className="text-green-400 font-bold">{currentMultiplier.toFixed(2)}x</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Potential Win:</span>
                <span className="text-yellow-400 font-bold">
                  {(Number.parseFloat(betAmount) * currentMultiplier).toFixed(4)} AR
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Revealed:</span>
                <span className="text-white font-bold">
                  {revealedCount} / {TOTAL_TILES - minesCount}
                </span>
              </div>

              {connected && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance:</span>
                  <span className="text-white font-bold">
                    {balance} AR
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {!connected && !isTestMode ? (
              <Button onClick={connect} className="w-full bg-purple-600 hover:bg-purple-700 text-white pixel-button" disabled={transactionLoading}>
                Connect Wallet
              </Button>
            ) : (
              <>
                <Button
                  onClick={gameState === "playing" ? handleCashout : startGame}
                  className={cn(
                    "w-full pixel-button",
                    gameState === "playing" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700",
                  )}
                  disabled={(gameState === "won" || gameState === "lost") || transactionLoading}
                >
                  {transactionLoading 
                    ? "Processing..." 
                    : gameState === "playing" 
                      ? "CASHOUT" 
                      : "PLACE BET"}
                </Button>

                {gameState !== "idle" && (
                  <Button onClick={resetGame} className="w-full bg-red-600 hover:bg-red-700 text-white pixel-button" disabled={transactionLoading}>
                    NEW GAME
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Game board */}
        <div className="w-full md:w-2/3">
          <div className="grid grid-cols-5 gap-2 bg-gray-900 p-4 rounded-lg border-2 border-gray-700">
            {tiles.map((tile) => (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile.id)}
                disabled={gameState !== "playing" || tile.state !== "hidden" || transactionLoading}
                className={cn(
                  "aspect-square pixel-tile relative flex items-center justify-center",
                  tile.state === "hidden" && "bg-gray-700 hover:bg-gray-600",
                  tile.state === "diamond" && "bg-blue-600",
                  tile.state === "mine" && "bg-red-600",
                  "border-4",
                  tile.state === "hidden" && "border-gray-600",
                  tile.state === "diamond" && "border-blue-500",
                  tile.state === "mine" && "border-red-500",
                  transactionLoading && "opacity-50",
                  "transition-colors duration-200",
                )}
              >
                {tile.state === "diamond" && <div className="pixel-diamond"></div>}
                {tile.state === "mine" && <div className="pixel-mine"></div>}
                {isTestMode && tile.isMine && tile.state === "hidden" && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
