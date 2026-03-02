import { Server, Socket } from 'socket.io'
import { ClientToServerEvents, ServerToClientEvents } from '@chasing-chairs/shared'
import { RoomManager } from '../room/RoomManager'

export class SocketHandler {
  constructor(
    private io: Server<ClientToServerEvents, ServerToClientEvents>,
    private roomManager: RoomManager
  ) {}

  private static roomTimeouts: Map<string, NodeJS.Timeout> = new Map()

  handleConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
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

        if (Object.keys(room.players).length === 2) {
          setTimeout(() => {
            this.roomManager.setRoomStatus(code, 'playing')
            this.io.to(code).emit('gameStarted', room.players)
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

      room.players[socket.id].position = newPos

      socket.to(roomCode).emit('playerMoved', {
        id: socket.id,
        direction,
        position: newPos,
      })
    })

    socket.on('playerSat', (roomCode) => {
      const room = this.roomManager.getRoom(roomCode)

      if (room && room.chair.isActive) {
        // 1. Desativa a cadeira IMEDIATAMENTE para evitar que dois sentem ao mesmo tempo
        room.chair.isActive = false
        room.chair.position = { x: -1, y: -1 }

        // 2. Atualiza a pontuação no "Source of Truth"
        const player = room.players[socket.id]
        if (player) {
          player.score += 1
          console.log(`[Game] ${player.name} pontuou! Novo score: ${player.score}`)
        }

        // 3. Avisa a sala quem ganhou a rodada e manda o placar novo
        this.io.to(roomCode).emit('chairTaken', socket.id)
        this.io.to(roomCode).emit('updatedPlayers', room.players)

        // 4. LIMPEZA DE TIMERS: Crucial para não encavalar rodadas
        // Use o 'static' ou a variável fora da classe como discutimos
        if (SocketHandler.roomTimeouts.has(roomCode)) {
          clearTimeout(SocketHandler.roomTimeouts.get(roomCode)!)
          SocketHandler.roomTimeouts.delete(roomCode)
        }

        // 5. REINÍCIO: Agenda a próxima rodada para daqui a 3 segundos
        console.log(`[Game] Agendando nova rodada para a sala ${roomCode}...`)
        setTimeout(() => {
          this.startRound(roomCode)
        }, 3000)
      }
    })

    socket.on('requestSync', (roomCode) => {
      const room = this.roomManager.getRoom(roomCode)
      if (room) {
        socket.emit('updatedPlayers', room.players)
      }
    })

    socket.on('disconnect', () => {
      if (currentRoomCode) {
        const room = this.roomManager.getRoom(currentRoomCode)
        if (room) {
          delete room.players[socket.id]
          socket.to(currentRoomCode).emit('playerDisconnected', socket.id)

          if (Object.keys(room.players).length === 0) {
            const timeout = SocketHandler.roomTimeouts.get(currentRoomCode)
            if (timeout) clearTimeout(timeout)
            SocketHandler.roomTimeouts.delete(currentRoomCode)
            this.roomManager.deleteRoom(currentRoomCode)
          }
        }
      }
    })
  }

  private async startRound(roomCode: string) {
    const room = this.roomManager.getRoom(roomCode)
    if (!room) return

    room.chair.isActive = false
    this.io.to(roomCode).emit('gameStarted', room.players)

    const musicUrl = await this.getRandomMusic()
    if (musicUrl) {
      this.io.to(roomCode).emit('musicStarted', { url: musicUrl })
    }

    const minDelay = 8_000
    const maxDelay = 20_000
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay

    // No seu Backend: SocketHandler.ts -> dentro de startRound()

    const timeout = setTimeout(() => {
      const currentRoom = this.roomManager.getRoom(roomCode)
      if (!currentRoom) return

      currentRoom.chair.position = this.roomManager.getRandomSpawnPosition(currentRoom)
      currentRoom.chair.isActive = true

      // 1. DISPARA OS DOIS EVENTOS JUNTOS:
      // Isso garante que a música pare NO MOMENTO exato em que a cadeira surge.
      this.io.to(roomCode).emit('musicStopped')
      this.io.to(roomCode).emit('chairSpawned', currentRoom.chair.position)

      SocketHandler.roomTimeouts.delete(roomCode)
    }, delay)

    SocketHandler.roomTimeouts.set(roomCode, timeout)
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
      // 1. Cria um "timer de bomba" de 3 segundos para o fetch
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      // 2. Passa o signal para o fetch abortar se demorar
      const response = await fetch(`https://api.deezer.com/search?q=${query}`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId) // Sucesso! Cancela a bomba

      if (!response.ok) return null // Proteção extra contra erro 500 do Deezer

      const data = await response.json()
      const tracks = data.data

      if (!tracks || tracks.length === 0) return null

      const randomTrack = tracks[Math.floor(Math.random() * Math.min(tracks.length, 25))]
      console.log(`[Audio] Selected music: ${randomTrack.title}`)

      return randomTrack.preview
    } catch (error) {
      // Se der timeout ou erro, o jogo cai aqui, mas CONTINUA a rodada!
      console.warn(
        `[Audio] Music fetch timed out or failed. Continuing round without music. error=${error}`
      )
      return null
    }
  }
}
