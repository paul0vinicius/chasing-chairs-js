import { Direction } from 'grid-engine'

export const calculateNextPos = (current: { x: number; y: number }, dir: Direction) => {
  const next = { ...current }
  if (dir === Direction.UP) next.y -= 1
  else if (dir === Direction.DOWN) next.y += 1
  else if (dir === Direction.LEFT) next.x -= 1
  else if (dir === Direction.RIGHT) next.x += 1

  return next
}
