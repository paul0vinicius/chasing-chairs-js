import { Dispatch, FC, SetStateAction, useState } from 'react'
import './Menu.css'
import { CreateRoom } from './CreateRoom'
import { socket } from '../../socket'
import { RoomData } from '@chasing-chairs/shared'
import { CreatedRoom } from './CreatedRoom'
import { EventBus } from '../../eventsBus'

interface MenuProps {
  setGameState: Dispatch<SetStateAction<'menu' | 'playing'>>
}

type MenuState = 'MAIN' | 'CREATE_ROOM' | 'CREATED_ROOM' | 'ENTER_ROOM' | 'HOW_TO' | 'CREDITS'

export const Menu: FC<MenuProps> = ({ setGameState }) => {
  const [currentView, setCurrentView] = useState<MenuState>('MAIN')
  const [roomData, setRoomData] = useState<RoomData | undefined>(undefined)

  const onCreateGame = (playerName: string, roomSize: number, rounds: number) => {
    socket.emit('createRoom', playerName, roomSize, rounds)
  }

  socket.on('roomCreated', (room) => {
    setRoomData(room)
    setCurrentView('CREATED_ROOM')
  })

  socket.on('gameStarted', () => {
    if (roomData) {
      cleanupAndStart(roomData)
    }
  })

  const cleanupAndStart = (roomData: RoomData) => {
    socket.off('roomCreated')
    socket.off('roomJoined')
    socket.off('gameStarted')
    socket.off('error')
    EventBus.emit('gameStarted', roomData)
    setGameState('playing')
  }

  return (
    <div className="menu-fullscreen-overlay">
      {currentView === 'MAIN' && (
        <div className="main-view-container">
          <div className="title-area">
            <h1 className="retro-title">CHASING CHAIRS:</h1>
            <h2 className="retro-subtitle">KAREN'S ADVENTURE</h2>
          </div>

          <div className="bottom-nav">
            <button onClick={() => setCurrentView('CREATE_ROOM')}>Criar uma sala</button>
            <button onClick={() => setCurrentView('ENTER_ROOM')}>Entrar em uma sala</button>
            <button onClick={() => setCurrentView('HOW_TO')}>Como jogar?</button>
            <button onClick={() => setCurrentView('CREDITS')}>Criadores</button>
          </div>
        </div>
      )}

      {currentView === 'CREATE_ROOM' && (
        <CreateRoom onCreateRoom={onCreateGame} onGoBack={() => setCurrentView('MAIN')} />
      )}
      {currentView === 'CREATED_ROOM' && (
        <CreatedRoom
          currentplayers={roomData ? Object.keys(roomData.players).length : 0}
          roomCode={roomData?.code ?? ''}
          roomSize={roomData?.size ?? 0}
          key="created-room-key"
        />
      )}
    </div>
  )
}
