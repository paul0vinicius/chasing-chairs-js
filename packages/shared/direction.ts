export enum OptimizedDirection {
  LEFT = 0,
  RIGHT = 1,
  UP = 2,
  DOWN = 3,
  NONE = 4,
}

export const DirectionMap: Record<string, number> = {
  left: OptimizedDirection.LEFT,
  right: OptimizedDirection.RIGHT,
  up: OptimizedDirection.UP,
  down: OptimizedDirection.DOWN,
  none: OptimizedDirection.NONE,
}

export const DirectionIdToName: Record<number, string> = {
  0: 'left',
  1: 'right',
  2: 'up',
  3: 'down',
  4: 'none',
}
