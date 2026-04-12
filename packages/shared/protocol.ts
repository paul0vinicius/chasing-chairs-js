/**
 * PROTOCOLO DE MOVIMENTO (Array-based)
 * [0] = ID do Jogador (string)
 * [1] = X (number - arredondado)
 * [2] = Y (number - arredondado)
 * [3] = Direção (number/Enum)
 * [4] = Estado de Animação (number/Enum)
 * [5] = Timestamp
 */
export type MovePayload = [string, number, number, number, number, number]

export const PlayerMapper = {
  serializeMove: (
    id: string,
    x: number,
    y: number,
    dir: number,
    anim: number,
    timestamp: number
  ): MovePayload => {
    return [id, Math.round(x), Math.round(y), dir, anim, timestamp]
  },

  deserializeMove: (data: MovePayload) => {
    return {
      id: data[0],
      x: data[1],
      y: data[2],
      dir: data[3],
      anim: data[4],
      timestamp: data[5],
    }
  },
}
