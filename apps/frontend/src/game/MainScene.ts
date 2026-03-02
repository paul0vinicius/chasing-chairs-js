import { Scene } from 'phaser'
import { GridEngine, Direction } from 'grid-engine'
import { RoomData } from '@chasing-chairs/shared'
import { socket } from './socket'
import { calculateNextPos } from '../utils/gridUtils'
import { SocketHandler, UIManager, MazeManager } from './managers'
import { Player, Chair } from './entitites'

export class MainScene extends Scene {
  private gridEngine!: GridEngine
  private socketHandler!: SocketHandler
  private uiManager!: UIManager
  private mazeManager!: MazeManager

  // Entidades Refatoradas
  private players: Map<string, Player> = new Map()
  private chair: Chair | null = null

  private currentRoom!: RoomData

  constructor() {
    super('MainScene')
  }

  init(data: { room: RoomData }) {
    this.currentRoom = data.room
  }

  preload() {
    // Mantenha o seu código de preload gerando texturas e áudio
    const tileGraphic = this.make.graphics({ x: 0, y: 0 })
    tileGraphic.lineStyle(1, 0xffffff, 0.2)
    tileGraphic.strokeRect(0, 0, 32, 32)
    tileGraphic.generateTexture('tileTexture', 32, 32)

    const playerGraphic = this.make.graphics({ x: 0, y: 0 })
    playerGraphic.fillStyle(0x00ff00, 1)
    playerGraphic.fillRect(2, 2, 28, 28)
    playerGraphic.generateTexture('playerTexture', 32, 32)

    const remoteGraphic = this.make.graphics({ x: 0, y: 0 })
    remoteGraphic.fillStyle(0xff0000, 1)
    remoteGraphic.fillRect(2, 2, 28, 28)
    remoteGraphic.generateTexture('remoteTexture', 32, 32)

    const chairGraphic = this.make.graphics({ x: 0, y: 0 })
    chairGraphic.fillStyle(0xffff00, 1)
    chairGraphic.fillRect(4, 4, 24, 24)
    chairGraphic.generateTexture('chairTexture', 32, 32)

    this.load.audio('alert', 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg')
  }

  create() {
    this.socketHandler = new SocketHandler(this, socket)
    this.uiManager = new UIManager(this, this.socketHandler, this.gridEngine)
    this.mazeManager = new MazeManager(this, this.gridEngine)

    const myId = this.socketHandler.id!
    const myData = this.currentRoom.players[myId]
    const startPos = myData ? myData.position : { x: 1, y: 1 }

    // 1. Constrói apenas o mapa
    this.mazeManager.buildMaze()

    // 2. Instancia o Jogador Local
    const localPlayer = new Player(
      this,
      this.gridEngine,
      myId,
      startPos,
      'playerTexture',
      this.mazeManager.worldContainer
    )
    this.players.set(myId, localPlayer)

    // 3. Instancia os Jogadores Remotos já existentes
    Object.values(this.currentRoom.players).forEach((p: any) => {
      if (p.id !== myId) this.addRemotePlayer(p)
    })

    this.uiManager.createControls()

    this.setupNetworkEvents()
    this.setupGameEvents()

    this.socketHandler.joinRoom(this.currentRoom.code, 'Player')
  }

  private setupNetworkEvents() {
    this.events.on('net:updatedPlayers', (serverPlayers: any) => {
      Object.values(serverPlayers).forEach((p: any) => {
        if (!this.players.has(p.id)) this.addRemotePlayer(p)
      })
    })

    this.events.on('net:playerMoved', ({ id, direction, position }: any) => {
      if (id === this.socketHandler.id) return // Ignora eco local

      if (this.gridEngine.hasCharacter(id)) {
        // 1. Faz o personagem remoto começar a andar na tela
        this.gridEngine.move(id, direction as Direction)

        // 2. Assim que ele parar de andar, conferimos se ele parou no lugar certo
        const sub = this.gridEngine.movementStopped().subscribe(({ charId }) => {
          if (charId === id && position) {
            const currentPos = this.gridEngine.getPosition(id)

            // Se o cliente dessincronizou do servidor, forçamos a correção invisível
            if (currentPos.x !== position.x || currentPos.y !== position.y) {
              console.warn(`[Sync] Corrigindo posição do jogador ${id}`)
              this.gridEngine.setPosition(id, position)
            }

            // MUITO IMPORTANTE: Limpamos a inscrição para não estourar a memória (Memory Leak)
            sub.unsubscribe()
          }
        })
      }
    })

    this.events.on('net:chairSpawned', (pos: { x: number; y: number }) =>
      this.handleChairSpawn(pos)
    )
    this.events.on('net:chairTaken', (id: string) => this.handleChairTaken(id))
    this.events.on('net:playerJoined', (data: any) => this.addRemotePlayer(data))

    this.events.on('net:playerDisconnected', (id: string) => {
      const p = this.players.get(id)
      if (p) {
        p.destroy()
        this.players.delete(id)
      }
    })

    this.events.on('net:musicStarted', (data: { url: string }) =>
      this.uiManager.handleMusic(data.url)
    )
  }

  private setupGameEvents() {
    this.gridEngine.movementStopped().subscribe(({ charId }) => {
      if (charId === this.socketHandler.id && this.chair) {
        const pos = this.gridEngine.getPosition(charId)
        if (pos.x === this.chair.position.x && pos.y === this.chair.position.y) {
          this.socketHandler.sendSat(this.currentRoom.code)

          const myPlayer = this.players.get(charId)
          if (myPlayer) myPlayer.setWinnerTint()

          // Removemos a referência da cadeira localmente para não enviar 2 vezes
          this.chair.position = { x: -1, y: -1 }
        }
      }
    })

    this.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
      if (charId === this.socketHandler.id) {
        const currentPos = this.gridEngine.getPosition(charId)
        const nextPos = calculateNextPos(currentPos, direction)
        this.socketHandler.sendMove(this.currentRoom.code, direction, nextPos)
      }
    })
  }

  private handleChairSpawn(pos: { x: number; y: number }) {
    this.uiManager.stopMusic()
    this.sound.play('alert')
    this.uiManager.showBanner('CHAIR APPEARED! RUN!')

    if (this.chair) this.chair.destroy()
    this.chair = new Chair(this, pos.x, pos.y, this.mazeManager.worldContainer)
  }

  private handleChairTaken(id: string) {
    const isMe = id === this.socketHandler.id
    this.uiManager.showBanner(
      id === 'RESET' ? 'ROUND RESETTING...' : isMe ? 'YOU WON!' : 'TOO SLOW!'
    )

    if (this.chair) {
      this.chair.destroy()
      this.chair = null
    }

    // Limpa a cor de todo mundo
    this.players.forEach((player) => player.clearTint())
  }

  private addRemotePlayer(data: any) {
    if (!this.sys || this.players.has(data.id)) return

    const remotePlayer = new Player(
      this,
      this.gridEngine,
      data.id,
      data.position,
      'remoteTexture',
      this.mazeManager.worldContainer
    )
    this.players.set(data.id, remotePlayer)
  }

  update() {
    if (!this.socketHandler?.id) return
    const cursors = this.input.keyboard!.createCursorKeys()

    // CORREÇÃO DO BUG: JustDown garante que o evento dispare apenas 1 vez por clique
    // O jogador precisa soltar a tecla e apertar de novo para andar mais um bloco.
    if (Phaser.Input.Keyboard.JustDown(cursors.left))
      this.gridEngine.move(this.socketHandler.id, Direction.LEFT)
    else if (Phaser.Input.Keyboard.JustDown(cursors.right))
      this.gridEngine.move(this.socketHandler.id, Direction.RIGHT)
    else if (Phaser.Input.Keyboard.JustDown(cursors.up))
      this.gridEngine.move(this.socketHandler.id, Direction.UP)
    else if (Phaser.Input.Keyboard.JustDown(cursors.down))
      this.gridEngine.move(this.socketHandler.id, Direction.DOWN)
  }
}
