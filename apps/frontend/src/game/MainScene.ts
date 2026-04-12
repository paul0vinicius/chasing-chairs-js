import { Scene } from 'phaser'
import { GridEngine, Direction } from 'grid-engine'
import { DirectionIdToName, RoomData, AnimState } from '@chasing-chairs/shared'
import { socket } from './socket'
import {
  SocketHandler,
  UIManager,
  MazeManager,
  ScoreboardManager,
  ScoreData,
  AnimationManager,
} from './managers'
import { Player, Chair } from './entitites'
import { EventBus } from './eventsBus'

export class MainScene extends Scene {
  private gridEngine!: GridEngine
  private socketHandler!: SocketHandler
  private uiManager!: UIManager
  private mazeManager!: MazeManager
  private animationManager!: AnimationManager
  private scoreboardManager!: ScoreboardManager
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

  private players: Map<string, Player> = new Map()
  private chair: Chair | null = null

  private currentRoom!: RoomData

  private lastDirectionSent: Direction = Direction.NONE

  constructor() {
    super('MainScene')
  }

  init(data: { room: RoomData }) {
    this.currentRoom = data.room

    this.players.clear()
    this.chair = null
    this.lastDirectionSent = Direction.NONE

    if (this.currentRoom.isMusicPlaying) {
      this.players.forEach((p) => p.dance())
    }
  }

  create() {
    this.socketHandler = new SocketHandler(this, socket)
    this.uiManager = new UIManager(this, this.socketHandler, this.gridEngine)
    this.mazeManager = new MazeManager(this, this.gridEngine)
    this.scoreboardManager = new ScoreboardManager(this, this.socketHandler.id!)
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.animationManager = new AnimationManager(this, this.gridEngine)

    this.animationManager.createPlayersAnimation()

    // 1. Constrói o labirinto com o mapa gerado pelo servidor!
    this.mazeManager.buildMaze(this.currentRoom.mapData, this.currentRoom.backgroundId)

    // 2. O backend já nos deu uma posição válida (myData.position)
    const myId = this.socketHandler.id!
    const myData = this.currentRoom.players[myId]

    // Passamos a posição sorteada pelo servidor para o Player
    const localPlayer = new Player(
      this,
      this.gridEngine,
      myId,
      myData.position,
      'karen',
      this.mazeManager
    )
    this.players.set(myId, localPlayer)

    this.refreshScoreboard(this.currentRoom.players)
    this.uiManager.createControls()

    this.setupNetworkEvents()
    this.setupGameEvents()

    const leaveRoomHandler = () => {
      this.leaveRoom()
    }

    EventBus.on('leaveRoom', leaveRoomHandler)

    this.events.on('shutdown', () => {
      EventBus.off('leaveRoom', leaveRoomHandler)
    })

    this.socketHandler.joinRoom(this.currentRoom.code, 'Player')
  }

  private leaveRoom() {
    console.log('[Game] Limpando a instância antiga...')

    if (this.uiManager) {
      this.uiManager.stopMusic()
    }

    this.scene.start('BootScene')
  }

  // Cria um helper para formatar os dados e enviar pro Manager
  private refreshScoreboard(serverPlayers: any) {
    const scoreData: ScoreData[] = Object.values(serverPlayers).map((p: any) => ({
      id: p.id,
      name: p.name || 'Player',
      score: p.score || 0, // Pega o score do servidor (ou 0 se não tiver ainda)
    }))

    this.scoreboardManager.updateScoreboard(scoreData)
  }

  private setupNetworkEvents() {
    this.events.on('net:updatedPlayers', (serverPlayers: any) => {
      Object.values(serverPlayers).forEach((p: any) => {
        if (!this.players.has(p.id)) this.addRemotePlayer(p)
      })

      if (this.currentRoom.isMusicPlaying) {
        this.players.forEach((p) => p.dance())
      }

      this.refreshScoreboard(serverPlayers)
    })

    this.events.on('net:gameStarted', () => {
      console.log('[Game] Nova rodada iniciada!')

      // 1. Limpa a cadeira antiga da tela e da memória
      if (this.chair) {
        this.chair.destroy()
        this.chair = null
      }

      // 3. (Opcional) Mostra um banner de "Música começando..."
      this.uiManager.showBanner('A MÚSICA VAI COMEÇAR!')
    })

    this.events.on('net:s', (payload: any[]) => {
      payload.forEach((data) => {
        const [id, x, y, dirIndex, anim] = data
        if (id === this.socketHandler.id) return

        const player = this.players.get(id)
        if (!player) return

        const directionName = DirectionIdToName[dirIndex] as Direction
        const localPos = this.gridEngine.getPosition(id)

        const dist = Phaser.Math.Distance.Between(localPos.x, localPos.y, x, y)

        const BASE_SPEED = 4

        if (dist > 1.5) {
          this.gridEngine.setSpeed(id, BASE_SPEED * 2)
        } else if (dist > 0.5) {
          this.gridEngine.setSpeed(id, BASE_SPEED * 1.5)
        } else {
          this.gridEngine.setSpeed(id, BASE_SPEED)
        }

        // Aplica o movimento da direção recebida
        if (directionName !== Direction.NONE) {
          this.gridEngine.move(id, directionName)
        }

        // Se no servidor ele parou (NONE), mas na nossa tela ele não chegou no destino (x,y)
        // Nós não mandamos parar ainda. Deixamos o GridEngine terminar o trajeto atual.
        if (directionName === Direction.NONE && dist <= 0.5) {
          this.gridEngine.setPosition(id, { x, y }) // Snap sutil só no final do repouso
        }

        this.handleRemoteAnimation(player, anim as AnimState)
      })
    })

    this.events.on('net:chairTaken', (id: string) => this.handleChairTaken(id))
    this.events.on('net:playerJoined', (data: any) => {
      this.addRemotePlayer(data)
      this.currentRoom.players[data.id] = data
      this.refreshScoreboard(this.currentRoom.players)
    })

    this.events.on('net:playerDisconnected', (id: string) => {
      const p = this.players.get(id)
      if (p) {
        p.destroy()
        this.players.delete(id)
        delete this.currentRoom.players[id] // Remove da sala local
        this.refreshScoreboard(this.currentRoom.players)
      }
    })

    this.events.on('net:musicStarted', (data: { url: string }) => {
      this.players.forEach((player) => {
        player.dance()
      })

      this.uiManager.handleMusic(data.url, this.currentRoom.code)
    })

    this.events.on('net:musicStopped', () => {
      console.log('[Audio] Parando a música porque a cadeira nasceu!')
      this.players.forEach((player) => {
        player.walk()
      })
      this.uiManager.stopMusic()
    })

    this.events.on('shutdown', () => {
      this.uiManager.stopMusic()
    })

    this.events.on('net:gameRestarted', (players: any) => {
      console.log('[Game] A partida foi reiniciada do zero!')

      this.refreshScoreboard(players)
    })
  }

  private handleRemoteAnimation(player: Player, state: AnimState) {
    switch (state) {
      case AnimState.SIT:
        player.sit()
        break
      case AnimState.IDLE:
        // Se não está sentado nem andando, volta pro idle/dance dependendo da música
        if (this.currentRoom.isMusicPlaying) player.dance()
        else player.walk()
        break
    }
  }

  private setupGameEvents() {
    this.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
      if (charId === this.socketHandler.id) {
        const currentPos = this.gridEngine.getPosition(charId)

        // Opcional: só envia se realmente mudou algo
        if (direction !== this.lastDirectionSent) {
          this.socketHandler.sendMove(this.currentRoom.code, direction, currentPos)
          this.lastDirectionSent = direction
        }
      }
    })

    // AVISA O SERVIDOR QUANDO PARAR
    this.gridEngine.movementStopped().subscribe(({ charId }) => {
      if (charId === this.socketHandler.id) {
        const currentPos = this.gridEngine.getPosition(charId)

        // Enviamos NONE para o servidor saber que o boneco parou no tile
        this.socketHandler.sendMove(this.currentRoom.code, Direction.NONE, currentPos)
        this.lastDirectionSent = Direction.NONE
      }
    })

    // Colisão da cadeira (mantenha como positionChangeFinished para ser rápido)
    this.gridEngine.positionChangeFinished().subscribe(({ charId }) => {
      if (charId === this.socketHandler.id) this.checkChairCollision()
    })

    this.events.on('net:chairSpawned', (pos: { x: number; y: number }) => {
      this.handleChairSpawn(pos)
      this.checkChairCollision()
    })
  }

  private checkChairCollision() {
    if (!this.chair || !this.socketHandler.id) return

    const myPos = this.gridEngine.getPosition(this.socketHandler.id)
    const chairPos = this.chair.position

    const isAtSameX = Math.round(myPos.x) === Math.round(chairPos.x)
    const isAtSameY = Math.round(myPos.y) === Math.round(chairPos.y)

    if (isAtSameX && isAtSameY) {
      console.log('SENTOU!')

      this.socketHandler.sendSat(this.currentRoom.code)

      this.chair.destroy()
      this.chair = null
    }
  }

  private handleChairSpawn(pos: { x: number; y: number }) {
    if (this.chair) {
      this.chair.destroy()
    }

    this.chair = new Chair(this, pos.x, pos.y, this.mazeManager)

    console.log(`[Game] Cadeira nasceu em: ${pos.x}, ${pos.y}`)
  }

  private handleChairTaken(id: string) {
    const isMe = id === this.socketHandler.id
    this.uiManager.showBanner(
      id === 'RESET' ? 'Vamos começar de novo!' : isMe ? 'Você venceu!' : 'Xiii... Lento demais!'
    )

    const player = this.players.get(id)
    if (player) {
      player.sit()
    }

    if (this.chair) {
      this.chair.destroy()
      this.chair = null
    }
  }

  private addRemotePlayer(data: any) {
    if (!this.sys || this.players.has(data?.id)) return

    const remotePlayer = new Player(
      this,
      this.gridEngine,
      data.id,
      data.position,
      'karen',
      this.mazeManager
    )

    remotePlayer.setRandomColor(this.players.size)
    this.players.set(data.id, remotePlayer)
  }

  update() {
    const myId = this.socketHandler.id
    if (!myId || !this.players.get(myId)?.canMove) return

    let newDirection = Direction.NONE

    if (this.cursors.left.isDown || this.uiManager.activeDirection === Direction.LEFT)
      newDirection = Direction.LEFT
    else if (this.cursors.right.isDown || this.uiManager.activeDirection === Direction.RIGHT)
      newDirection = Direction.RIGHT
    else if (this.cursors.up.isDown || this.uiManager.activeDirection === Direction.UP)
      newDirection = Direction.UP
    else if (this.cursors.down.isDown || this.uiManager.activeDirection === Direction.DOWN)
      newDirection = Direction.DOWN

    if (newDirection !== Direction.NONE) {
      if (
        this.gridEngine.getFacingDirection(myId) !== newDirection ||
        !this.gridEngine.isMoving(myId)
      ) {
        this.gridEngine.move(myId, newDirection)
      }
    } else {
      if (this.gridEngine.isMoving(myId)) {
        this.gridEngine.stopMovement(myId)
      }
    }
  }
}
