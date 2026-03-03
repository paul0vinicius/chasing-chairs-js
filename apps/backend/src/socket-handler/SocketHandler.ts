import { Server, Socket } from 'socket.io'
import { ClientToServerEvents, RoomData, ServerToClientEvents } from '@chasing-chairs/shared'
import { RoomManager } from '../room/RoomManager'

export class SocketHandler {
  constructor(
    private io: Server<ClientToServerEvents, ServerToClientEvents>,
    private roomManager: RoomManager
  ) {}

  private static roomTimeouts: Map<string, NodeJS.Timeout> = new Map()

  handleConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
    let currentRoomCode: string | null = null

    socket.on('createRoom', (playerName, roomSize, rounds) => {
      const room = this.roomManager.createRoom(socket.id, playerName, roomSize, rounds)
      currentRoomCode = room.code
      socket.join(room.code)
      socket.emit('roomCreated', room)

      this.verifyIfRoomIsReady(room, room.code)
    })

    socket.on('joinRoom', (code, playerName) => {
      const room = this.roomManager.joinRoom(code, socket.id, playerName)
      if (room) {
        currentRoomCode = code
        socket.join(code)

        socket.emit('roomJoined', room)
        socket.to(code).emit('playerJoined', room.players[socket.id])

        this.verifyIfRoomIsReady(room, code)
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
        room.chair.isActive = false
        room.chair.position = { x: -1, y: -1 }

        const player = room.players[socket.id]
        if (!player) return

        player.score += 1
        console.log(`[Game] ${player.name} pontuou! Score: ${player.score}`)

        // 1. INCREMENTA A RODADA
        room.currentRound = (room.currentRound || 0) + 1

        this.io.to(roomCode).emit('chairTaken', socket.id)
        this.io.to(roomCode).emit('updatedPlayers', room.players)

        if (SocketHandler.roomTimeouts.has(roomCode)) {
          clearTimeout(SocketHandler.roomTimeouts.get(roomCode)!)
          SocketHandler.roomTimeouts.delete(roomCode)
        }

        // 2. VERIFICA SE O JOGO ACABOU
        if (room.currentRound >= room.rounds) {
          console.log(`[Game] Sala ${roomCode} terminou! Max Rounds atingido.`)
          this.roomManager.setRoomStatus(roomCode, 'finished')

          // Dá um pequeno atraso (2 segundos) para as pessoas verem quem sentou por último
          setTimeout(() => {
            this.io.to(roomCode).emit('gameOver', room.players)
          }, 2000)
        } else {
          // 3. SE NÃO ACABOU, CONTINUA PARA A PRÓXIMA RODADA
          console.log(`[Game] Agendando rodada ${room.currentRound + 1} para a sala ${roomCode}...`)
          setTimeout(() => {
            this.startRound(roomCode)
          }, 3000)
        }
      }
    })

    socket.on('playAgain', (roomCode) => {
      const room = this.roomManager.getRoom(roomCode)

      if (room && room.status === 'finished') {
        const player = room.players[socket.id]
        if (!player) return

        // 1. Marca este jogador como pronto para a próxima partida
        player.isReadyToPlayAgain = true
        console.log(`[Game] ${player.name} quer jogar novamente na sala ${roomCode}`)

        // 2. Verifica se TODOS os jogadores atualmente na sala estão prontos
        const playersList = Object.values(room.players)
        const allReady = playersList.every((p) => p.isReadyToPlayAgain)

        if (allReady) {
          console.log(`[Game] Todos prontos! Reiniciando sala ${roomCode}...`)

          // 3. Zera os dados da sala e dos jogadores
          room.currentRound = 0
          playersList.forEach((p) => {
            p.score = 0
            p.isReadyToPlayAgain = false // Reseta a flag para o fim da próxima partida
          })

          this.roomManager.setRoomStatus(roomCode, 'playing')

          // 4. Avisa o frontend para limpar a tela e o placar
          this.io.to(roomCode).emit('gameRestarted', room.players)

          // 5. Dá a largada na nova partida!
          setTimeout(() => {
            this.startRound(roomCode)
          }, 2000)
        }
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

  private verifyIfRoomIsReady(room: RoomData, roomCode: string) {
    if (Object.keys(room.players).length === room.size) {
      setTimeout(() => {
        this.roomManager.setRoomStatus(roomCode, 'playing')
        this.io.to(roomCode).emit('gameStarted', room.players)
        this.startRound(roomCode)
      }, 1500)
    }
  }

  private async startRound(roomCode: string) {
    const room = this.roomManager.getRoom(roomCode)
    if (!room) return

    room.chair.isActive = false
    this.io.to(roomCode).emit('gameStarted', room.players)

    const musicUrl = await this.getRandomMusic()
    if (musicUrl) {
      this.io.to(roomCode).emit('musicStarted', { url: musicUrl })
      this.roomManager.getRoom(roomCode).isMusicPlaying = true
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
      this.roomManager.getRoom(roomCode).isMusicPlaying = false
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
