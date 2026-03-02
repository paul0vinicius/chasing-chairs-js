import { RoomData, RoomStatus } from '@chasing-chairs/shared'
import { INITIAL_STATE_CHAIR, INITIAL_STATE_PLAYER } from './constants'

// 1. Banco de Mapas do Backend
const AVAILABLE_MAPS = [
  // Mapa Original
  [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
  ],
  // Mapa Alternativo (Corredores diferentes)
  [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
  ],
]

export class RoomManager {
  private rooms: Map<string, RoomData> = new Map()

  // Função utilitária: Mapeia todos os "0" (chão) do mapa selecionado
  private getWalkableTiles(mapData: number[][]): { x: number; y: number }[] {
    const walkable: { x: number; y: number }[] = []
    for (let y = 0; y < mapData.length; y++) {
      for (let x = 0; x < mapData[y].length; x++) {
        if (mapData[y][x] === 0) {
          walkable.push({ x, y })
        }
      }
    }
    return walkable
  }

  // Função utilitária: Pega um tile aleatório que não esteja ocupado por outro jogador
  public getRandomSpawnPosition(room: RoomData): { x: number; y: number } {
    const walkableTiles = this.getWalkableTiles(room.mapData)
    const occupiedPositions = Object.values(room.players).map(
      (p) => `${p.position.x},${p.position.y}`
    )

    // Filtra os tiles vazios removendo os que já têm alguém em cima
    const availableSpawns = walkableTiles.filter(
      (tile) => !occupiedPositions.includes(`${tile.x},${tile.y}`)
    )

    // Sorteia um dos locais disponíveis (fallback para 1,1 se der algum erro bizarro)
    if (availableSpawns.length === 0) return { x: 1, y: 1 }
    const randomIndex = Math.floor(Math.random() * availableSpawns.length)
    return availableSpawns[randomIndex]
  }

  createRoom(hostId: string, hostName: string): RoomData {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase()

    const randomMapIndex = Math.floor(Math.random() * AVAILABLE_MAPS.length)
    // 1. Clonando o mapa para que uma sala não altere as paredes da outra
    const selectedMap = JSON.parse(JSON.stringify(AVAILABLE_MAPS[randomMapIndex]))

    const newRoom: RoomData = {
      code,
      players: {},
      // 2. Clonando a cadeira para quebrar a referência global de memória
      chair: JSON.parse(JSON.stringify(INITIAL_STATE_CHAIR)),
      status: 'waiting',
      mapData: selectedMap,
    }

    const hostSpawn = this.getRandomSpawnPosition(newRoom)
    newRoom.players[hostId] = {
      ...INITIAL_STATE_PLAYER,
      id: hostId,
      name: hostName,
      position: hostSpawn,
    }

    this.rooms.set(code, newRoom)
    return newRoom
  }

  joinRoom(code: string, playerId: string, playerName: string): RoomData | null {
    const room = this.rooms.get(code)

    // O limite de jogadores (MAX_ROOM_SIZE) geralmente é 4, ajuste se o seu for diferente
    if (room && room.status === 'waiting' && Object.keys(room.players).length < 4) {
      // Sorteia a posição para o novo jogador baseada no mapa ÚNICO desta sala
      const spawnPos = this.getRandomSpawnPosition(room)

      // DEEP COPY: Garante que o novo jogador tenha um estado 100% isolado na memória
      const cleanPlayerState = JSON.parse(JSON.stringify(INITIAL_STATE_PLAYER))

      room.players[playerId] = {
        ...cleanPlayerState,
        id: playerId,
        name: playerName,
        position: spawnPos, // Já entra no lugar certo
      }

      return room
    }

    return null
  }

  getRoom(code: string): RoomData | undefined {
    return this.rooms.get(code)
  }

  deleteRoom(code: string): boolean {
    console.log(`Room ${code} deleted (empty)`)
    return this.rooms.delete(code)
  }

  setRoomStatus(code: string, status: RoomStatus) {
    const room = this.rooms.get(code)
    if (room) {
      room.status = status
    }
  }
}
