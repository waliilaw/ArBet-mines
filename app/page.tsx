'use client'
import MinesGame from "@/components/mines-game"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4" style={{
      background: "#1a0a0a",
      backgroundImage: `
        linear-gradient(45deg, rgba(234,179,8,0.15) 25%, transparent 25%, transparent 75%, rgba(147,51,234,0.15) 75%),
        linear-gradient(45deg, rgba(147,51,234,0.15) 25%, transparent 25%, transparent 75%, rgba(234,179,8,0.15) 75%)
      `,
      backgroundSize: "80px 80px",
      backgroundPosition: "0 0, 40px 40px",
      position: "relative",
      overflow: "hidden",
    }}>
      <h1 className="text-4xl font-bold text-white mb-8 font-pixel" style={{
        textShadow: "3px 3px 0 #000",
        letterSpacing: "2px",
        color: "#fef3c7",
        textStroke: "1px #000"
      }}>MINES GAME</h1>
      
      <MinesGame />
    </main>
  )
}
