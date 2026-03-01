import { Player } from '@chasing-chairs/shared'
import { Chair } from '@chasing-chairs/shared/chair.types'

export const INITIAL_STATE_PLAYER: Pick<Player, 'isSitting' | 'position' | 'speed'> = {
  isSitting: false,
  position: { x: 0, y: 0 },
  speed: 1,
}

export const INITIAL_STATE_CHAIR: Chair = {
  isActive: false,
  position: { x: -1, y: -1 },
}
