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

  private roomTimeouts: Map<string, NodeJS.Timeout> = new Map()

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

        // 1. Tell the guest they are officially in the lobby
        socket.emit('roomJoined', room)

        // 2. Tell the host someone new arrived
        socket.to(code).emit('playerJoined', room.players[socket.id])

        // 3. If the room is now ready (e.g., 2 players), trigger the synchronized start
        if (Object.keys(room.players).length === 2) {
          // Give them 1 second to see the "Lobby" state before jumping in
          setTimeout(() => {
            this.roomManager.setRoomStatus(code, 'playing')

            // Broadcast to EVERYONE in the room
            this.io.to(code).emit('gameStarted', room.players)

            // Start the actual game logic (music/chairs)
            this.startRound(code)
          }, 1500)
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

    socket.on('playerMoved', (roomCode, direction, newPos) => {
      const room = this.roomManager.getRoom(roomCode)
      if (!room || !room.players[socket.id]) return

      // Update the Source of Truth
      room.players[socket.id].position = newPos

      // Broadcast to everyone ELSE (socket.to) instead of everyone (io.to)
      // This helps prevent the local player from receiving their own move back
      socket.to(roomCode).emit('playerMoved', {
        id: socket.id,
        direction,
        position: newPos,
      })
    })

    socket.on('playerSat', (roomCode) => {
      const room = this.roomManager.getRoom(roomCode)
      if (room && room.chair.isActive) {
        room.chair.isActive = false
        room.chair.position = { x: -1, y: -1 }

        this.io.to(roomCode).emit('chairTaken', socket.id)

        // Clear any existing timeout for this room before starting a new round
        if (this.roomTimeouts.has(roomCode)) {
          clearTimeout(this.roomTimeouts.get(roomCode)!)
        }

        // Start next round after a 3 second "celebration" delay
        setTimeout(() => this.startRound(roomCode), 3000)
      }
    })

    // Inside handleConnection(socket) in SocketHandler.ts

    socket.on('requestSync', (roomCode) => {
      const room = this.roomManager.getRoom(roomCode)

      if (room) {
        // We only emit to the specific socket that requested it (socket.emit)
        // not the whole room (io.to)
        socket.emit('updatedPlayers', room.players)
        console.log(`[SYNC] Sent current player states for room ${roomCode} to ${socket.id}`)
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
    if (!room) return

    // Reset chair state just to be safe
    room.chair.isActive = false

    // 1. Tell everyone to start and SEND the current player positions
    this.io.to(roomCode).emit('gameStarted', room.players)

    const musicUrl = await this.getRandomMusic()
    if (musicUrl) {
      this.io.to(roomCode).emit('musicStarted', { url: musicUrl })
    }

    const minDelay = 8_000
    const maxDelay = 20_000
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay

    const timeout = setTimeout(() => {
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
      this.roomTimeouts.delete(roomCode)
    }, delay)

    this.roomTimeouts.set(roomCode, timeout)
  }

  private async getRandomMusic() {
    const queries = [
      'agnes beautiful madness',
      'marina sena coisas naturais',
      'anitta funk generation',
      'slayyyter',
    ]
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
