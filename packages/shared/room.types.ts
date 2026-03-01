import { Chair } from './chair.types'
import { Player } from './player.types'

export type RoomStatus = 'waiting' | 'playing' | 'finished'

export interface RoomData {
  code: string
  players: Record<string, Player>
  chair: Chair
  status: RoomStatus
}
