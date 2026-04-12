import { useState } from 'react'
import GameComponent from './game/GameComponent'
import { Menu } from './game/entitites/menu/Menu'
import { GameOverScreen } from './game/entitites/menu/GameOverScreen'
import { RoomData } from '@chasing-chairs/shared'
import { socket } from './game/socket'
import { EventBus } from './game/eventsBus'

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'game_over'>('menu')
  const [roomData, setRoomData] = useState<RoomData | undefined>(undefined)

  socket.on('roomCreated', (roomData) => setRoomData(roomData))
  socket.on('roomJoined', (roomData) => setRoomData(roomData))

  socket.on('gameOver', () => {
    setGameState('game_over')
  })

  const handleReturnToMenu = () => {
    EventBus.emit('leaveRoom')

    setRoomData(undefined)
    setGameState('menu')
  }

  return (
    <>
      <GameComponent />

      {gameState === 'menu' && <Menu setGameState={setGameState} />}

      {gameState === 'game_over' && (
        <GameOverScreen
          players={roomData ? roomData.players : {}}
          onReturnToMenu={handleReturnToMenu}
        />
      )}
    </>
  )
}
