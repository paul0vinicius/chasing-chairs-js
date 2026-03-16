import { FC, useState } from 'react'
import { RetroInput, RetroButton, RetroSelector } from '../../../components'
import { RotateOverlay } from './RotateOverlay'

const MAX_PLAYERS = 4
const ROUNDS = [1, 3, 5, 10]

interface CreateRoomProps {
  onGoBack: () => void
  onCreateRoom: (playerName: string, roomSize: number, rounds: number) => void
}

export const CreateRoom: FC<CreateRoomProps> = ({ onGoBack, onCreateRoom }) => {
  const [playerName, setPlayerName] = useState('')
  const [roomSize, setRoomSize] = useState(1)
  const [roundsIndex, setRoundsIndex] = useState(0)

  const rounds = ROUNDS[roundsIndex]

  return (
    <div className="flex flex-col items-center justify-center w-full h-full max-w-2xl mx-auto animate-fade-in relative px-safe-left pt-safe-top pb-safe-bottom">
      <RotateOverlay />

      <div className="absolute top-2 left-2 z-10">
        <RetroButton className="!text-[10px] md:!text-xs !py-1 !px-3 !min-w-0" onClick={onGoBack}>
          &lt; Voltar
        </RetroButton>
      </div>

      <div className="flex flex-col w-full max-w-md gap-3 mt-4">
        <div className="w-full">
          <RetroInput
            placeholder="Seu nome"
            value={playerName}
            onChange={(e: any) => setPlayerName(e.target.value)}
          />
        </div>

        <div className="flex flex-col w-full gap-1">
          <RetroSelector
            label="Jogadores"
            value={roomSize}
            onIncrement={() => setRoomSize((prev) => Math.min(MAX_PLAYERS, prev + 1))}
            onDecrement={() => setRoomSize((prev) => Math.max(1, prev - 1))}
          />

          <RetroSelector
            label="Rodadas"
            value={rounds}
            onIncrement={() =>
              setRoundsIndex((prev) => (prev + 1 > ROUNDS.length - 1 ? prev : prev + 1))
            }
            onDecrement={() => setRoundsIndex((prev) => (prev - 1 < 0 ? prev : prev - 1))}
          />
        </div>

        <div className="flex justify-center w-full mt-2">
          <RetroButton
            className="!px-12"
            onClick={() => onCreateRoom(playerName, roomSize, rounds)}
          >
            Criar sala
          </RetroButton>
        </div>
      </div>
    </div>
  )
}
