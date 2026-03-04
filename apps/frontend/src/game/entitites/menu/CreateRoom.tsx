import { FC, useState } from 'react'

interface CreateRoomProps {
  onGoBack: () => void
  onCreateRoom: (playerName: string, roomSize: number, rounds: number) => void
}

export const CreateRoom: FC<CreateRoomProps> = ({ onGoBack, onCreateRoom }) => {
  const [playerName, setPlayerName] = useState('')
  const [roomSize, setRoomSize] = useState(1)
  const [rounds, setRounds] = useState(1)

  return (
    <div className="lobby-view-container">
      <button className="back-btn" onClick={onGoBack}>
        &lt; VOLTAR
      </button>

      <div className="lobby-section">
        <input
          type="text"
          placeholder="Your Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="retro-input"
        />

        <div className="retro-selectors">
          <div className="selector">
            <button onClick={() => setRoomSize(Math.max(1, roomSize - 1))}>&lt;</button>
            <span>PLAYERS: {roomSize}</span>
            <button onClick={() => setRoomSize(roomSize + 1)}>&gt;</button>
          </div>

          <div className="selector">
            <button onClick={() => setRounds(Math.max(1, rounds - 1))}>&lt;</button>
            <span>ROUNDS: {rounds}</span>
            <button onClick={() => setRounds(rounds + 1)}>&gt;</button>
          </div>
        </div>

        <button
          className="action-btn create-btn"
          onClick={() => onCreateRoom(playerName, roomSize, rounds)}
        >
          [ CREATE ROOM ]
        </button>
      </div>
    </div>
  )
}
