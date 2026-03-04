import { FC } from 'react'

interface CreatedRoomProps {
  roomCode: string
  roomSize: number
  currentplayers: number
}

export const CreatedRoom: FC<CreatedRoomProps> = ({ roomCode, roomSize, currentplayers }) => {
  return (
    <div className="retro-selectors">
      <div className="selector">
        <div>LOBBY: {roomCode}</div>
      </div>

      <div className="selector">
        <div>WAITING FOR ALL PLAYERS</div>
        <div>{`${currentplayers}/${roomSize} players joined!`}</div>
      </div>
    </div>
  )
}
