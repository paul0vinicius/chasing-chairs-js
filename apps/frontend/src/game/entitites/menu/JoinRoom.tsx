import { FC, useState } from 'react'
import { RetroButton, RetroInput } from '../../../components'

interface JoinRoomProps {
  onGoBack: () => void
  onJoinRoom: (playerName: string, roomCode: string) => void
}

export const JoinRoom: FC<JoinRoomProps> = ({ onJoinRoom, onGoBack }) => {
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')

  return (
    <div className="flex flex-col items-center gap-8 w-full h-full max-w-sm animate-fade-in justify-center px-4 relative animate-fade-in">
      <RetroButton
        className="absolute top-6 left-6 md:top-10 md:left-10 !text-lg md:!text-xl !py-1 !px-4"
        onClick={onGoBack}
      >
        &lt; Voltar
      </RetroButton>

      <RetroInput
        placeholder="Your Name"
        value={playerName}
        onChange={(e: any) => setPlayerName(e.target.value)}
      />

      <RetroInput
        placeholder="Room Code (to join)"
        value={roomCode}
        onChange={(e: any) => setRoomCode(e.target.value)}
      />

      <div className="mt-4">
        <RetroButton onClick={() => onJoinRoom(playerName, roomCode)}>Join Room</RetroButton>
      </div>
    </div>
  )
}
