import { FC, useState } from 'react'

interface JoinRoomProps {
  onJoinRoom: (playerName: string, roomCode: string) => void
}

export const JoinRoom: FC<JoinRoomProps> = ({ onJoinRoom }) => {
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')

  return (
    <div className="lobby-section">
      <input
        type="text"
        placeholder="Your Name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        className="retro-input"
      />
      <input
        type="text"
        placeholder="Room Code (to join)"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        className="retro-input"
      />
      <button className="action-btn join-btn" onClick={() => onJoinRoom(playerName, roomCode)}>
        [ JOIN ROOM ]
      </button>
    </div>
  )
}
