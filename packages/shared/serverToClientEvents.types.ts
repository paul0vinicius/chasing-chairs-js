import { Direction, Position } from './position.types'
import { Player } from './player.types'

interface PlayerMovedProps {
  id: string
  direction: Direction
}

interface MusicStartedProps {
  url: string
}

export interface ServerToClientEvents {
  // Game State Events
  playerJoined: (player: Player) => void
  updatedPlayers: (players: Record<string, Player>) => void
  playerMoved: (playerMovedProps: PlayerMovedProps) => void
  playerDisconnected: (id: string) => void
  gameStarted: () => void
  chairSpawned: (position: Position) => void
  chairTaken: (playerId: string) => void

  // Music Events
  musicStarted: (musicStartedProps: MusicStartedProps) => void
}
