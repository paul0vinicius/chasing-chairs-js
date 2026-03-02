import { Socket } from 'socket.io-client'
import { ClientToServerEvents, ServerToClientEvents } from '@chasing-chairs/shared'
import { Direction } from 'grid-engine'

export class SocketHandler {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents>
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene, socket: Socket<ServerToClientEvents, ClientToServerEvents>) {
    this.scene = scene
    this.socket = socket
    this.setupListeners()
  }

  private setupListeners() {
    // Repassa os eventos do Socket para o sistema de eventos do Phaser
    this.socket.on('playerJoined', (data) => this.scene.events.emit('net:playerJoined', data))
    this.socket.on('playerMoved', (data) => this.scene.events.emit('net:playerMoved', data))
    this.socket.on('playerDisconnected', (id) =>
      this.scene.events.emit('net:playerDisconnected', id)
    )
    this.socket.on('chairSpawned', (pos) => this.scene.events.emit('net:chairSpawned', pos))
    this.socket.on('chairTaken', (id) => this.scene.events.emit('net:chairTaken', id))
    this.socket.on('musicStarted', (data) => this.scene.events.emit('net:musicStarted', data))
    this.socket.on('gameStarted', (players) => this.scene.events.emit('net:gameStarted', players))
    this.socket.on('updatedPlayers', (players) =>
      this.scene.events.emit('net:updatedPlayers', players)
    )
  }

  // Métodos de saída (Ações que o jogador toma)
  joinRoom(roomCode: string, name: string) {
    this.socket.emit('joinRoom', roomCode, name)
    this.socket.emit('requestSync', roomCode)
  }

  sendMove(roomCode: string, direction: Direction, nextPos: { x: number; y: number }) {
    this.socket.emit('playerMoved', roomCode, direction, nextPos)
  }

  sendSat(roomCode: string) {
    this.socket.emit('playerSat', roomCode)
  }

  sendRestart(roomCode: string) {
    this.socket.emit('restartRound', roomCode)
  }

  get id() {
    return this.socket.id
  }
}
