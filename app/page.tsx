import MinesGame from "@/components/mines-game"
import { GameModeToggle } from "@/components/game-mode-toggle"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-white mb-8 font-pixel">MINES GAME</h1>
      
      {/* Game Mode Toggle Switch */}
      <GameModeToggle />
      
      <MinesGame />
    </main>
  )
}
