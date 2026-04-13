import { useState } from 'react'
import GameComponent from './game/GameComponent'
import { Menu } from './game/entitites/menu/Menu'
import { GameOverScreen } from './game/entitites/menu/GameOverScreen'
import { socket } from './game/socket'
import { EventBus } from './game/eventsBus'
import { Player } from '@chasing-chairs/shared'

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'game_over'>('menu')
  const [players, setPlayers] = useState<Record<string, Player>>({})

  socket.on('gameOver', (playersFromServer) => {
    setPlayers(playersFromServer)
    setGameState('game_over')
  })

  const handleReturnToMenu = () => {
    EventBus.emit('leaveRoom')
    setGameState('menu')
  }

  return (
    <>
      <GameComponent />
      {gameState === 'menu' && <Menu setGameState={setGameState} />}
      {gameState === 'game_over' && (
        <GameOverScreen onReturnToMenu={handleReturnToMenu} players={players} />
      )}
    </>
  )
}
