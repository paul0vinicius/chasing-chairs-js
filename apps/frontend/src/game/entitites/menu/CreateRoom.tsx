import { FC, useState } from 'react'
import { RetroInput, RetroButton, RetroSelector } from '../../../components'

interface CreateRoomProps {
  onGoBack: () => void
  onCreateRoom: (playerName: string, roomSize: number, rounds: number) => void
}

export const CreateRoom: FC<CreateRoomProps> = ({ onGoBack, onCreateRoom }) => {
  const [playerName, setPlayerName] = useState('')
  const [roomSize, setRoomSize] = useState(1)
  const [rounds, setRounds] = useState(1)

  return (
    <div className="flex flex-col items-center gap-8 w-full h-full max-w-sm animate-fade-in justify-center px-4 relative animate-fade-in">
      <RetroButton
        className="absolute top-6 left-6 md:top-10 md:left-10 !text-lg md:!text-xl !py-1 !px-4"
        onClick={onGoBack}
      >
        &lt; Voltar
      </RetroButton>

      <div className="flex flex-col items-center w-full max-w-md gap-8 mt-12 md:mt-0">
        <RetroInput
          placeholder="Your Name"
          value={playerName}
          onChange={(e: any) => setPlayerName(e.target.value)}
        />

        <div className="flex flex-col w-full gap-4">
          <RetroSelector
            label="Players"
            value={roomSize}
            onIncrement={() => setRoomSize((prev) => prev + 1)}
            onDecrement={() => setRoomSize((prev) => Math.max(1, prev - 1))}
          />

          <RetroSelector
            label="Rounds"
            value={rounds}
            onIncrement={() => setRounds((prev) => prev + 1)}
            onDecrement={() => setRounds((prev) => Math.max(1, prev - 1))}
          />
        </div>

        <div className="mt-4">
          <RetroButton onClick={() => onCreateRoom(playerName, roomSize, rounds)}>
            Create Room
          </RetroButton>
        </div>
      </div>
    </div>
  )
}
