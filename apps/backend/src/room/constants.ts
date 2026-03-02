import { Player } from '@chasing-chairs/shared'
import { Chair } from '@chasing-chairs/shared/chair.types'

export const INITIAL_STATE_PLAYER: Omit<Player, 'id' | 'name'> = {
  isSitting: false,
  position: { x: 0, y: 0 },
  speed: 1,
  score: 0,
}

export const INITIAL_STATE_CHAIR: Chair = {
  isActive: false,
  position: { x: -1, y: -1 },
}
