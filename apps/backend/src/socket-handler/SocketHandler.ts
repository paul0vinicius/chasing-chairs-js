import { Server, Socket } from 'socket.io'
import { ClientToServerEvents, ServerToClientEvents } from '@chasing-chairs/shared'
import { RoomManager } from '../room/RoomManager'

// Move map constants here
const mapWidth = 8
const mapHeight = 5
const walls = [
  { x: 2, y: 2 },
  { x: 3, y: 2 },
  { x: 5, y: 2 },
  { x: 5, y: 3 },
]

export class SocketHandler {
  constructor(
    private io: Server<ClientToServerEvents, ServerToClientEvents>,
    private roomManager: RoomManager
  ) {}

  handleConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
    // We store the room code here so we know where the player is if they disconnect
    let currentRoomCode: string | null = null

    socket.on('createRoom', (playerName) => {
      const room = this.roomManager.createRoom(socket.id, playerName)
      currentRoomCode = room.code
      socket.join(room.code)
      socket.emit('roomCreated', room)
    })

    socket.on('joinRoom', (code, playerName) => {
      const room = this.roomManager.joinRoom(code, socket.id, playerName)
      if (room) {
        currentRoomCode = code
        socket.join(code)
        socket.emit('roomJoined', room)
        socket.to(code).emit('playerJoined', room.players[socket.id])

        // If you want the game to start when 2 people join:
        if (Object.keys(room.players).length === 2) {
          // Add a tiny delay, then start the round for this specific room
          setTimeout(() => {
            this.roomManager.setRoomStatus(code, 'playing')
            this.startRound(code)
          }, 2000)
        }
      } else {
        socket.emit('error', 'Room not found or full')
      }
    })

    socket.on('startGame', (roomCode) => {
      const room = this.roomManager.getRoom(roomCode)
      if (room && room.status === 'waiting') {
        this.roomManager.setRoomStatus(roomCode, 'playing')
        this.startRound(roomCode)
      }
    })

    socket.on('playerMoved', (roomCode, direction) => {
      const room = this.roomManager.getRoom(roomCode)
      if (!room || !room.players[socket.id]) return

      const player = room.players[socket.id]
      const { position, speed } = player

      if (direction === 'left') position.x -= speed
      else if (direction === 'right') position.x += speed
      else if (direction === 'up') position.y -= speed
      else if (direction === 'down') position.y += speed

      socket.to(roomCode).emit('playerMoved', { id: socket.id, direction })
    })

    socket.on('playerSat', (roomCode) => {
      const room = this.roomManager.getRoom(roomCode)
      if (room && room.chair.isActive) {
        console.log(`Player ${socket.id} won the round in room ${roomCode}!`)

        room.chair.isActive = false
        room.chair.position = { x: -1, y: -1 }

        socket.to(roomCode).emit('chairTaken', socket.id)

        // Start next round for this specific room
        this.startRound(roomCode)
      }
    })

    socket.on('disconnect', () => {
      // Use the stored room code because the client can't send it when they drop connection
      if (currentRoomCode) {
        const room = this.roomManager.getRoom(currentRoomCode)
        if (room) {
          delete room.players[socket.id]
          socket.to(currentRoomCode).emit('playerDisconnected', socket.id)

          // Optional: If room is empty, delete it entirely to save RAM
          if (Object.keys(room.players).length === 0) {
            this.roomManager.deleteRoom(currentRoomCode)
          }
        }
      }
    })
  }

  // --- PRIVATE GAME LOGIC METHODS --- //

  private async startRound(roomCode: string) {
    const room = this.roomManager.getRoom(roomCode)
    if (!room || room.chair.isActive) return

    // Tell everyone to transition from the "Waiting" UI to the active game
    this.io.to(roomCode).emit('gameStarted')

    const musicUrl = await this.getRandomMusic()
    // Emit ONLY to the room
    this.io.to(roomCode).emit('musicStarted', { url: musicUrl })

    const delay = Math.floor(Math.random() * 3000) + 10_000

    setTimeout(() => {
      // Re-fetch the room in case it was deleted during the timeout
      const currentRoom = this.roomManager.getRoom(roomCode)
      if (!currentRoom) return

      let rx = -1,
        ry = -1
      let isWall = true
      while (isWall) {
        rx = Math.floor(Math.random() * (mapWidth - 2)) + 1
        ry = Math.floor(Math.random() * (mapHeight - 2)) + 1
        isWall = walls.some((w) => w.x === rx && w.y === ry)
      }

      currentRoom.chair.position = { x: rx, y: ry }
      currentRoom.chair.isActive = true

      this.io.to(roomCode).emit('chairSpawned', currentRoom.chair.position)
      console.log(`Chair spawned at ${rx}, ${ry} for room ${roomCode}`)
    }, delay)
  }

  private async getRandomMusic() {
    const queries = ['brazilian funk']
    const query = queries[Math.floor(Math.random() * queries.length)]
    try {
      const response = await fetch(`https://api.deezer.com/search?q=${query}`)
      const data = await response.json()
      const tracks = data.data
      const randomTrack = tracks[Math.floor(Math.random() * Math.min(tracks.length, 25))]
      return randomTrack.preview
    } catch (error) {
      console.error('Music fetch failed:', error)
      return null
    }
  }
}
