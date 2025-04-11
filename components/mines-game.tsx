"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Image from "next/image"
import { useArweaveWallet } from "@/hooks/use-arweave-wallet"
import { generateMines } from "@/lib/ao-randomness"
import { placeBet, claimWinnings, fetchArweaveBalance } from "@/lib/arweave-integration"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { SoundToggle, useSoundEffects } from "./sound-toggle"
import { WalletDisplay } from './wallet-display'
import { WalletNotFound } from './wallet-not-found'

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

// Add these styles to your CSS
const tileStyles = {
  hidden: "bg-gray-700 hover:bg-gray-600 border-2 border-gray-800 shadow-inner",
  revealed: "bg-gray-800 border-2 border-gray-700",
  mine: "bg-red-900 border-2 border-red-800",
  diamond: "bg-green-800 border-2 border-green-700"
};

export default function MinesGame() {
  // Game state
  const [gameState, setGameState] = useState<GameState>("idle")
  const [tiles, setTiles] = useState<Tile[]>([])
  const [minesCount, setMinesCount] = useState(DEFAULT_MINES_COUNT)
  const [betAmount, setBetAmount] = useState("0.1")
  const [currentMultiplier, setCurrentMultiplier] = useState(1)
  const [revealedCount, setRevealedCount] = useState(0)
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [currentGameId, setCurrentGameId] = useState<string>("")
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Sound effects
  const { playGemSound, playMineSound } = useSoundEffects(soundEnabled)

  // Arweave wallet integration
  const { 
    connected, 
    address, 
    balance, 
    isConnecting, 
    isWalletInstalled,
    isBraveBrowser,
    walletError,
    connect,
    disconnect // Needed for the WalletDisplay component
  } = useArweaveWallet()

  // Calculate potential win based on revealed tiles and bet amount
  const calculateMultiplier = useCallback((revealed: number) => {
    if (revealed === 0) return 1

    const safeSquares = TOTAL_TILES - minesCount
    let multiplier = 1

    for (let i = 0; i < revealed; i++) {
      multiplier *= (safeSquares - i) / (TOTAL_TILES - i)
    }

    // Inverse the multiplier and apply house edge
    multiplier = 0.97 / multiplier
    return Number.parseFloat(multiplier.toFixed(2))
  }, [minesCount])

  // Reset game to initial state
  const resetGame = useCallback(async () => {
    const newTiles: Tile[] = Array.from({ length: TOTAL_TILES }, (_, id) => ({
      id,
      state: "hidden",
      isMine: false,
    }))

    setTiles(newTiles)
    setGameState("idle")
    setRevealedCount(0)
    setCurrentMultiplier(1)
    setCurrentGameId("")
  }, [])

  // Initialize game board
  useEffect(() => {
    resetGame()
  }, [minesCount, resetGame])

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

  // Update the connect wallet button
  const handleConnectWallet = useCallback(async () => {
    if (isConnecting) return;
    try {
      await connect();
    } catch (error) {
      console.error("Error connecting wallet:", error);
      
      // Show a specific toast for wallet not installed
      if (error instanceof Error && error.message === 'WALLET_NOT_INSTALLED') {
        toast({
          title: "WANDER WALLET NOT FOUND",
          description: (
            <div className="font-pixel">
              <div className="bg-red-900 p-2 rounded border-2 border-red-700 mb-2">
                Wallet extension not detected
              </div>
              <a 
                href="https://www.wander.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full p-2 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded border-2 border-blue-800 text-center"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  imageRendering: "pixelated",
                  boxShadow: "0 2px 0 rgba(0,0,0,0.2)"
                }}
              >
                INSTALL WANDER
              </a>
            </div>
          ),
          variant: "destructive",
          className: "pixelated-toast",
          style: {
            border: "3px solid #991b1b",
            boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
            background: "linear-gradient(to bottom, #1f2937, #111827)",
          },
        });
      }
    }
  }, [connect, isConnecting, toast]);

  // Update the start game function
  const startGame = useCallback(async () => {
    if (!connected) {
      toast({
        title: "WALLET NOT CONNECTED",
        description: (
          <div className="font-pixel">
            <div className="bg-red-900 p-2 rounded border-2 border-red-700">
              Please connect your Wander wallet to play
            </div>
            <button 
              className="mt-2 w-full p-2 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded border-2 border-blue-800"
              onClick={handleConnectWallet}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                imageRendering: "pixelated",
                boxShadow: "0 2px 0 rgba(0,0,0,0.2)"
              }}
            >
              CONNECT NOW
            </button>
          </div>
        ),
        variant: "destructive",
        className: "pixelated-toast",
        style: {
          border: "3px solid #991b1b",
          boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
          background: "linear-gradient(to bottom, #1f2937, #111827)",
        },
      });
      return;
    }

    if (Number.parseFloat(betAmount) <= 0) {
      toast({
        title: "Invalid bet amount",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      })
      return
    }

    if (Number.parseFloat(betAmount) > Number.parseFloat(balance)) {
      toast({
        title: "Insufficient Balance",
        description: (
          <div className="font-pixel">
            <div className="bg-red-900 p-2 rounded border-2 border-red-700">
              <span className="text-yellow-400">Balance:</span> {balance} AR
            </div>
            <div className="bg-gray-800 p-2 rounded border-2 border-gray-700">
              <span className="text-yellow-400">Bet:</span> {betAmount} AR
            </div>
            <div className="mt-3 text-sm">
              You need {(Number(betAmount) - Number(balance)).toFixed(4)} more AR to place this bet.
            </div>
          </div>
        ),
        variant: "destructive",
        className: "pixelated-toast",
        style: {
          border: "3px solid #991b1b",
          boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
          background: "linear-gradient(to bottom, #1f2937, #111827)",
        },
      })
      return
    }

    try {
      setTransactionLoading(true);
      
      // Generate mine positions using AO randomness
      const mines = await generateMines(TOTAL_TILES, minesCount)

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
      try {
        const { txId, gameId } = await placeBet(betAmount, minesCount);
        setCurrentGameId(gameId);
        
        toast({
          title: "BET PLACED SUCCESSFULLY!",
          description: (
            <div className="font-pixel">
              <div className="bg-blue-900 p-2 rounded border-2 border-blue-700 mb-2">
                <span className="text-yellow-400">Transaction:</span> {txId.substring(0, 8)}...
              </div>
            </div>
          ),
          className: "pixelated-toast",
          style: {
            border: "3px solid #1e40af",
            boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
            background: "linear-gradient(to bottom, #1f2937, #111827)",
          },
        });
      } catch (error) {
        console.error("Error placing bet:", error);
        toast({
          title: "ERROR PLACING BET",
          description: (
            <div className="font-pixel">
              <div className="bg-red-900 p-2 rounded border-2 border-red-700">
                <span>Failed to place bet on Arweave</span>
              </div>
            </div>
          ),
          variant: "destructive",
          className: "pixelated-toast",
          style: {
            border: "3px solid #991b1b",
            boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
            background: "linear-gradient(to bottom, #1f2937, #111827)",
          },
        });
        // Reset the game since bet failed
        resetGame();
        return;
      }

      toast({
        title: "GAME STARTED!",
        description: (
          <div className="font-pixel">
            <div className="bg-blue-900 p-2 rounded border-2 border-blue-700 mb-2">
              <span className="text-yellow-400">Bet:</span> {betAmount} AR
            </div>
            <div className="bg-purple-900 p-2 rounded border-2 border-purple-700">
              <span className="text-yellow-400">Mines:</span> {minesCount}
            </div>
            <div className="text-sm mt-2">Avoid the mines and find the gems!</div>
          </div>
        ),
        className: "pixelated-toast",
        style: {
          border: "3px solid #1e40af",
          boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
          background: "linear-gradient(to bottom, #1f2937, #111827)",
        },
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
  }, [betAmount, balance, connected, minesCount, resetGame]);

  // Handle tile click
  const handleTileClick = useCallback(async (tileId: number) => {
    if (gameState !== "playing") return

    const clickedTile = tiles[tileId]
    if (clickedTile.state !== "hidden") return

    if (clickedTile.isMine) {
      // Play mine sound
      playMineSound();
      
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
        title: "BOOM! YOU HIT A MINE!",
        description: (
          <div className="font-pixel">
            <div className="bg-red-900 p-2 rounded border-2 border-red-800 mb-2">
              <span className="text-yellow-400">Lost:</span> {betAmount} AR
            </div>
            <div className="text-sm mt-2">Better luck next time, miner!</div>
          </div>
        ),
        variant: "destructive",
        className: "pixelated-toast",
        style: {
          border: "3px solid #7f1d1d",
          boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
          background: "linear-gradient(to bottom, #1f2937, #111827)",
        },
      })
    } else {
      // Play gem sound
      playGemSound();
      
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
        try {
          const winAmount = (Number.parseFloat(betAmount) * newMultiplier).toFixed(4);
          const revealedPositions = updatedTiles
            .filter(tile => tile.state === "diamond")
            .map(tile => tile.id);
            
          await claimWinnings(currentGameId, winAmount, revealedPositions);
          
          toast({
            title: "CONGRATULATIONS!",
            description: (
              <div className="font-pixel">
                <div className="bg-green-900 p-2 rounded border-2 border-green-700 mb-2">
                  <span className="text-yellow-400">Won:</span> {winAmount} AR
                </div>
                <div className="bg-blue-900 p-2 rounded border-2 border-blue-700">
                  <span className="text-yellow-400">Multiplier:</span> {newMultiplier.toFixed(2)}x
                </div>
                <div className="text-sm mt-2">You revealed all safe tiles!</div>
              </div>
            ),
            className: "pixelated-toast",
            style: {
              border: "3px solid #065f46",
              boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
              background: "linear-gradient(to bottom, #1f2937, #111827)",
            },
          });
        } catch (error) {
          console.error("Error claiming complete win:", error);
          toast({
            title: "CONGRATULATIONS!",
            description: (
              <div className="font-pixel">
                <div className="bg-green-900 p-2 rounded border-2 border-green-700 mb-2">
                  <span className="text-yellow-400">Won:</span> {(Number.parseFloat(betAmount) * newMultiplier).toFixed(4)} AR
                </div>
                <div className="bg-red-900 p-2 rounded border-2 border-red-700 mt-2">
                  <span className="text-sm">Error claiming winnings</span>
                </div>
              </div>
            ),
            variant: "destructive",
            className: "pixelated-toast",
            style: {
              border: "3px solid #991b1b",
              boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
              background: "linear-gradient(to bottom, #1f2937, #111827)",
            },
          });
        }
      }
    }
  }, [
    betAmount, currentGameId, gameState, minesCount, playGemSound, 
    playMineSound, revealedCount, tiles, calculateMultiplier
  ]);

  // Handle cashout
  const handleCashout = useCallback(async () => {
    if (gameState !== "playing") return

    try {
      setTransactionLoading(true)
      
      // Get all revealed positions
      const revealedPositions = tiles
        .filter(tile => tile.state === "revealed" || tile.state === "diamond")
        .map(tile => tile.id)

      // Calculate final multiplier
      const finalMultiplier = calculateMultiplier(revealedCount)
      const winAmount = (Number.parseFloat(betAmount) * finalMultiplier).toFixed(4)

      // Update UI to show win
      setGameState("won")
      
      // Mark all safe tiles as diamonds
      const updatedTiles = tiles.map(tile => {
        if (!tile.isMine && tile.state === "hidden") {
          return { ...tile, state: "diamond" as TileState }
        } else if (tile.isMine && tile.state === "hidden") {
          return { ...tile, state: "mine" as TileState }
        }
        return tile
      })
      
      setTiles(updatedTiles)

      try {
        // Claim winnings on Arweave
        const txId = await claimWinnings(currentGameId, winAmount, revealedPositions);
        
        toast({
          title: "Win claimed successfully!",
          description: `You won ${winAmount} AR! Transaction ID: ${txId.substring(0, 8)}...`,
        });
      } catch (error) {
        console.error("Error claiming winnings:", error);
        toast({
          title: "Error claiming winnings",
          description: "There was an error claiming your winnings on Arweave",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in cashout:", error);
      toast({
        title: "Error cashing out",
        description: "There was an error processing your cashout",
        variant: "destructive",
      });
    } finally {
      setTransactionLoading(false);
    }
  }, [betAmount, calculateMultiplier, currentGameId, gameState, revealedCount, tiles]);

  // Memoize game board
  const gameBoard = useMemo(() => (
    <div className="grid grid-cols-5 gap-2">
      {tiles.map((tile) => (
        <button
          key={tile.id}
          onClick={() => handleTileClick(tile.id)}
          disabled={gameState !== "playing" || tile.state !== "hidden" || transactionLoading}
          className={cn(
            "aspect-square relative flex items-center justify-center mine-tile transition-all duration-200",
            tileStyles[tile.state],
            "hover:scale-105 active:scale-95",
            "pixelated-box",
            transactionLoading && "opacity-50"
          )}
          style={{
            boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)",
            backgroundImage: tile.state === "hidden" 
              ? "linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.1) 75%), linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.1) 75%)"
              : "none",
            backgroundSize: "4px 4px",
            backgroundPosition: "0 0, 2px 2px"
          }}
        >
          {tile.state === "diamond" && (
            <div className="w-full h-full flex items-center justify-center">
              <Image 
                src="/green-image.png" 
                alt="Gem" 
                width={40} 
                height={40} 
                className="pixelated-image" 
              />
            </div>
          )}
          
          {tile.state === "mine" && (
            <div className="w-full h-full flex items-center justify-center">
              <Image 
                src="/red-image.png" 
                alt="Mine" 
                width={40} 
                height={40} 
                className="pixelated-image" 
              />
            </div>
          )}
        </button>
      ))}
    </div>
  ), [tiles, gameState, transactionLoading, handleTileClick]);

  // Memoize game controls
  const gameControls = useMemo(() => (
    <div className="flex flex-col gap-4 w-full md:w-1/3">
      <div className="bg-gray-900 p-4 rounded-lg border-2 border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4 font-pixel">GAME SETTINGS</h2>

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

          <div className="flex justify-between items-center">
            <Label htmlFor="sound-toggle" className="text-white">
              Sound Effects:
            </Label>
            <SoundToggle onToggle={setSoundEnabled} />
          </div>
        </div>
      </div>

      <div className="bg-gray-900 p-4 rounded-lg border-2 border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4 font-pixel">GAME INFO</h2>

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
              {(Number.parseFloat(betAmount) * currentMultiplier).toFixed(2)} AR
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
                {balance.slice(0, balance.indexOf('.') + 3)} AR
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {!connected ? (
          <>
            <Button 
              onClick={handleConnectWallet} 
              className="w-full font-pixel bg-purple-600 hover:bg-purple-700 text-white border-2 border-purple-500"
              disabled={isConnecting || transactionLoading}
              style={{
                boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
                textShadow: "2px 2px 0 rgba(0,0,0,0.2)",
                imageRendering: "pixelated"
              }}
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
            
            {walletError === 'Wander wallet extension not found' && (
              <WalletNotFound />
            )}
          </>
        ) : (
          <>
            <Button
              onClick={gameState === "playing" ? handleCashout : startGame}
              className={cn(
                "w-full font-pixel",
                gameState === "playing" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700",
                "border-2",
                gameState === "playing" ? "border-green-500" : "border-blue-500"
              )}
              disabled={(gameState === "won" || gameState === "lost") || transactionLoading}
              style={{
                boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
                textShadow: "2px 2px 0 rgba(0,0,0,0.2)",
                imageRendering: "pixelated"
              }}
            >
              {transactionLoading 
                ? "Processing..." 
                : gameState === "playing" 
                  ? "CASHOUT" 
                  : "PLACE BET"}
            </Button>

            {gameState !== "idle" && (
              <Button 
                onClick={resetGame} 
                className="w-full font-pixel bg-red-600 hover:bg-red-700 text-white border-2 border-red-500"
                disabled={transactionLoading}
                style={{
                  boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
                  textShadow: "2px 2px 0 rgba(0,0,0,0.2)",
                  imageRendering: "pixelated"
                }}
              >
                NEW GAME
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  ), [
    connected, isConnecting, gameState, transactionLoading, 
    betAmount, minesCount, currentMultiplier, revealedCount, balance,
    handleConnectWallet, startGame, handleCashout, resetGame
  ]);

  // Check wallet installation on mount
  useEffect(() => {
    if (!isWalletInstalled) {
      setTimeout(() => {
        const title = isBraveBrowser 
          ? "ARWEAVE WALLET NOT DETECTED" 
          : "WANDER WALLET NOT DETECTED";
        
        const description = isBraveBrowser
          ? <div className="font-pixel">
              <div className="bg-yellow-900 p-2 rounded border-2 border-yellow-700 mb-2">
                <span className="text-white">Using Brave Browser</span>
              </div>
              <div className="bg-red-900 p-2 rounded border-2 border-red-700 mb-2">
                Arweave wallet not detected
              </div>
              <div className="text-sm mb-2">
                If already installed:
                <ul className="list-disc pl-5 mt-1 mb-1">
                  <li>Check extensions menu</li>
                  <li>Ensure permissions granted</li>
                </ul>
              </div>
              <a 
                href="https://www.wander.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full p-2 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded border-2 border-blue-800 text-center"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  imageRendering: "pixelated",
                  boxShadow: "0 2px 0 rgba(0,0,0,0.2)"
                }}
              >
                GET WANDER WALLET
              </a>
            </div>
          : <div className="font-pixel">
              <div className="bg-red-900 p-2 rounded border-2 border-red-700 mb-2">
                Wander Wallet not installed
              </div>
              <a 
                href="https://www.wander.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full p-2 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded border-2 border-blue-800 text-center"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  imageRendering: "pixelated",
                  boxShadow: "0 2px 0 rgba(0,0,0,0.2)"
                }}
              >
                INSTALL WANDER
              </a>
            </div>;
            
        toast({
          title,
          description,
          className: "pixelated-toast",
          style: {
            border: "3px solid #991b1b",
            boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
            background: "linear-gradient(to bottom, #1f2937, #111827)",
          },
        });
      }, 1000); // Delay to ensure UI is fully loaded
    }
  }, [isWalletInstalled, isBraveBrowser, toast]);

  // Check wallet connection status changes
  useEffect(() => {
    console.log('Wallet connection status in MinesGame:', { 
      connected, 
      address, 
      walletInstalled: isWalletInstalled,
      browser: isBraveBrowser
    });
    
    // Force rerender of the WalletDisplay component when connection status changes
    const walletDisplay = document.querySelector('.wallet-display-container');
    if (walletDisplay) {
      walletDisplay.classList.toggle('wallet-update');
    }
  }, [connected, address, isWalletInstalled, isBraveBrowser]);

  return (
    <div className="pixel-container bg-gray-800 p-6 rounded-lg border-4 border-gray-700 shadow-lg max-w-3xl w-full">
      <div className="wallet-display-container">
        <WalletDisplay />
      </div>
      
      {!isWalletInstalled ? (
        <div className="my-6">
          <h2 className="text-2xl font-bold text-white mb-4 font-pixel text-center">MINES GAME</h2>
          <WalletNotFound />
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          {gameControls}
          
          <div className="w-full md:w-2/3">
            <div className="bg-gray-900 p-4 rounded-lg border-2 border-gray-700">
              {gameBoard}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
