import { Direction } from './position.types'

export interface ClientToServerEvents {
  createRoom: (playerName: string) => void
  joinRoom: (roomCode: string, playerName: string) => void
  restartRound: (roomCode: string) => void

  joinedGame: (name: string) => void
  playerMoved: (roomCode: string, direction: Direction) => void
  playerSat: (id: string) => void
  startGame: (roomCode: string) => void
}
