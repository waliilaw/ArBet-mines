import MinesGame from "@/components/mines-game"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-white mb-8 pixel-font">MINES GAME</h1>
      <MinesGame />
    </main>
  )
}
