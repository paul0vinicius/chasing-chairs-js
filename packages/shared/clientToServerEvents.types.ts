import { Direction } from './position.types'

export interface ClientToServerEvents {
  joinedGame: (name: string) => void
  playerMoved: (direction: Direction) => void
  playerSat: (chairId: string) => void
  startedGame: () => void
  restartedRound: () => void
}
