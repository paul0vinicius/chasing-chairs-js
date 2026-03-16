import { FC, useState } from 'react'
import { RetroInput, RetroButton } from '../../../components'
import { RotateOverlay } from './RotateOverlay'

interface JoinRoomProps {
  onGoBack: () => void
  onJoinRoom: (code: string, playerName: string) => void
}

export const JoinRoom: FC<JoinRoomProps> = ({ onGoBack, onJoinRoom }) => {
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')

  return (
    <div className="flex flex-col items-center justify-center w-full h-full max-w-2xl mx-auto animate-fade-in relative px-safe-left pt-safe-top pb-safe-bottom">
      <RotateOverlay />
      <div className="absolute top-2 left-2 z-10">
        <RetroButton className="!text-[10px] md:!text-xs !py-1 !px-3 !min-w-0" onClick={onGoBack}>
          &lt; Voltar
        </RetroButton>
      </div>

      <div className="flex flex-col w-full max-w-md gap-4 mt-2">
        <div className="flex flex-col gap-3">
          <RetroInput
            placeholder="Seu nome"
            value={playerName}
            onChange={(e: any) => setPlayerName(e.target.value)}
          />
          <RetroInput
            placeholder="Código da sala"
            value={roomCode}
            onChange={(e: any) => setRoomCode(e.target.value.toUpperCase())}
          />
        </div>

        <div className="flex justify-center w-full mt-2">
          <RetroButton className="!px-12" onClick={() => onJoinRoom(playerName, roomCode)}>
            Entrar
          </RetroButton>
        </div>
      </div>
    </div>
  )
}
