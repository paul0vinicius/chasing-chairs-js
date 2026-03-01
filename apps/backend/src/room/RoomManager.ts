import { RoomData, RoomStatus } from '@chasing-chairs/shared'
import { INITIAL_STATE_CHAIR, INITIAL_STATE_PLAYER } from './constants'

const MAX_ROOM_SIZE = 4

export class RoomManager {
  private rooms: Map<string, RoomData> = new Map()

  createRoom(hostId: string, hostName: string): RoomData {
    // Generate a random 4-character code
    const code = Math.random().toString(36).substring(2, 6).toUpperCase()

    const newRoom: RoomData = {
      code,
      players: {
        [hostId]: {
          ...INITIAL_STATE_PLAYER,
          id: hostId,
          name: hostName,
        },
      },
      chair: INITIAL_STATE_CHAIR,
      status: 'waiting',
    }

    this.rooms.set(code, newRoom)
    return newRoom
  }

  joinRoom(code: string, playerId: string, playerName: string): RoomData | null {
    const room = this.rooms.get(code)

    // Check if room exists, is waiting, and has less than 4 players
    if (room && room.status === 'waiting' && Object.keys(room.players).length < MAX_ROOM_SIZE) {
      room.players[playerId] = {
        ...INITIAL_STATE_PLAYER,
        id: playerId,
        name: playerName,
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
