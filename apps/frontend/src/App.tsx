import { useState } from 'react'
import GameComponent from './game/GameComponent'
import { Menu } from './game/entitites/menu/Menu'

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu')

  return (
    <>
      <GameComponent /> {/* O Phaser roda sempre em background */}
      {gameState === 'menu' && <Menu setGameState={setGameState} />}
    </>
  )
}
