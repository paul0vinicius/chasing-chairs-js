import { Dispatch, FC, SetStateAction, useEffect, useRef, useState } from 'react'
import './Menu.css'
import { CreateRoom } from './CreateRoom'
import { socket } from '../../socket'
import { RoomData } from '@chasing-chairs/shared'
import { CreatedRoom } from './CreatedRoom'
import { EventBus } from '../../eventsBus'
import { JoinRoom } from './JoinRoom'
import { RetroButton } from '../../../components'

interface MenuProps {
  setGameState: Dispatch<SetStateAction<'menu' | 'playing'>>
}

type MenuState = 'MAIN' | 'CREATE_ROOM' | 'ROOM_READY' | 'ENTER_ROOM' | 'HOW_TO' | 'CREDITS'

export const Menu: FC<MenuProps> = ({ setGameState }) => {
  const [currentView, setCurrentView] = useState<MenuState>('MAIN')
  const [roomData, setRoomData] = useState<RoomData | undefined>(undefined)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio('/assets/audio/menu_theme.m4a')
    audioRef.current.loop = true
    audioRef.current.volume = 0.1

    audioRef.current?.play()

    return () => {
      audioRef.current?.pause()
    }
  }, [])

  const onCreateRoom = (playerName: string, roomSize: number, rounds: number) => {
    socket.emit('createRoom', playerName, roomSize, rounds)
  }

  const onJoinRoom = (playerName: string, roomCode: string) => {
    socket.emit('joinRoom', roomCode, playerName)
  }

  const onGoBackToMenu = () => setCurrentView('MAIN')

  socket.on('roomCreated', (roomData) => {
    setRoomData(roomData)
    setCurrentView('ROOM_READY')
  })

  socket.on('gameStarted', () => {
    if (roomData) {
      cleanupAndStart(roomData)
    }
  })

  socket.on('roomJoined', (roomData) => {
    setRoomData(roomData)
    setCurrentView('ROOM_READY')
  })

  socket.on('error', (msg) => {
    alert(`Error: ${msg}`)
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
    <div className="bg-menu bg-cover bg-center flex flex-col items-center justify-center w-full h-full relative px-safe-left px-safe-right pt-safe-top pb-safe-bottom">
      {currentView === 'MAIN' && (
        <div className="flex flex-col items-center animate-fade-in">
          <div className="text-center mb-16">
            <h1 className="font-bayoc text-6xl md:text-8xl text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] -webkit-text-stroke-1">
              Chasing chairs:
            </h1>
            <h2 className="font-bayoc text-3xl md:text-5xl text-white mt-2 drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]">
              Karen returns!
            </h2>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <RetroButton onClick={() => setCurrentView('CREATE_ROOM')}>Criar Sala</RetroButton>
            <RetroButton onClick={() => setCurrentView('ENTER_ROOM')}>Entrar</RetroButton>
          </div>
        </div>
      )}

      {currentView === 'CREATE_ROOM' && (
        <CreateRoom onCreateRoom={onCreateRoom} onGoBack={onGoBackToMenu} />
      )}
      {currentView === 'ENTER_ROOM' && (
        <JoinRoom onJoinRoom={onJoinRoom} onGoBack={onGoBackToMenu} />
      )}
      {currentView === 'ROOM_READY' && (
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
