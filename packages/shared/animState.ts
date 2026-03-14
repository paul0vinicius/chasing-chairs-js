export const AnimState = {
  IDLE: 0,
  WALK: 1,
  SIT: 2,
  WIN: 3,
  LOSE: 4,
} as const

export type AnimState = (typeof AnimState)[keyof typeof AnimState]
