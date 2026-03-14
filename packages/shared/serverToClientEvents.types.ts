import { Position } from './position.types'
import { Player } from './player.types'
import { RoomData } from './room.types'
import { MovePayload } from '@chasing-chairs/shared'

interface MusicStartedProps {
  url: string
}

export interface ServerToClientEvents {
  // Game State Events
  roomCreated: (room: RoomData) => void
  roomJoined: (room: RoomData) => void
  playerJoinedRoom: (players: Player[]) => void
  gameWillStart: (countdown: number) => void
  error: (message: string) => void
  playerJoined: (player: Player) => void
  updatedPlayers: (players: Record<string, Player>) => void
  playerMoved: (playerMovedProps: MovePayload) => void
  playerDisconnected: (id: string) => void
  gameStarted: (serverPlayers: any) => void
  chairSpawned: (position: Position) => void
  chairTaken: (playerId: string) => void
  gameOver: (finalPlayers: Record<string, any>) => void
  gameRestarted: (players: Record<string, any>) => void
  s: (data: any) => void

  // Music Events
  musicStarted: (musicStartedProps: MusicStartedProps) => void
  musicStopped: () => void
}
