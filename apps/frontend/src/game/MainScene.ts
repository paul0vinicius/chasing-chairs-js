import { Scene } from 'phaser'
import { GridEngine, Direction } from 'grid-engine'
import { DirectionIdToName, MovePayload, PlayerMapper, RoomData } from '@chasing-chairs/shared'
import { socket } from './socket'
import { calculateNextPos } from '../utils/gridUtils'
import {
  SocketHandler,
  UIManager,
  MazeManager,
  ScoreboardManager,
  ScoreData,
  AnimationManager,
} from './managers'
import { Player, Chair } from './entitites'

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

    // 3. Adiciona os jogadores remotos (que também já vêm com a posição correta)
    Object.values(this.currentRoom.players).forEach((p) => {
      if (p.id !== myId) this.addRemotePlayer(p)
    })

    this.refreshScoreboard(this.currentRoom.players)
    this.uiManager.createControls()

    this.setupNetworkEvents()
    this.setupGameEvents()

    this.socketHandler.joinRoom(this.currentRoom.code, 'Player')
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

    this.events.on('net:playerMoved', (data: MovePayload) => {
      // 1. Deserializa o array otimizado
      const { id, x, y, dir } = PlayerMapper.deserializeMove(data)

      if (id === this.socketHandler.id) return // Ignora eco local

      if (this.gridEngine.hasCharacter(id)) {
        const directionName = DirectionIdToName[dir] as Direction
        const serverPos = { x, y }

        // 2. Movimenta o personagem na grade
        this.gridEngine.move(id, directionName)

        // 3. Sincronização Inteligente:
        // Em vez de esperar parar, verificamos a distância atual.
        // Se ele estiver a mais de 1 tile de distância do que o servidor diz, corrigimos.
        const currentPos = this.gridEngine.getPosition(id)
        const distance = Phaser.Math.Distance.Between(
          currentPos.x,
          currentPos.y,
          serverPos.x,
          serverPos.y
        )

        if (distance > 1) {
          // Correção suave: Se for uma distância pequena, o GridEngine suaviza.
          // Se for grande (lag pesado), ele teleporta.
          this.gridEngine.setPosition(id, serverPos)
        }
      }
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

    this.events.on('net:gameOver', (finalPlayers: any) => {
      this.uiManager.showGameOverScreen(finalPlayers, this.currentRoom.code)
    })

    this.events.on('net:gameRestarted', (players: any) => {
      console.log('[Game] A partida foi reiniciada do zero!')

      this.refreshScoreboard(players)
    })
  }

  private setupGameEvents() {
    this.gridEngine.movementStopped().subscribe(({ charId }) => {
      if (charId === this.socketHandler.id) {
        this.checkChairCollision()
      }
    })

    // Novo ouvinte: Quando a cadeira nasce
    this.events.on('net:chairSpawned', (pos: { x: number; y: number }) => {
      this.handleChairSpawn(pos)
      // Checa imediatamente se ela nasceu embaixo de mim!
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
      id === 'RESET' ? 'ROUND RESETTING...' : isMe ? 'YOU WON!' : 'TOO SLOW!'
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
    if (!this.sys || this.players.has(data.id)) return

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

    // 1. Prioridade para o Teclado
    if (this.cursors.left.isDown) newDirection = Direction.LEFT
    else if (this.cursors.right.isDown) newDirection = Direction.RIGHT
    else if (this.cursors.up.isDown) newDirection = Direction.UP
    else if (this.cursors.down.isDown) newDirection = Direction.DOWN

    // 2. Se não houver teclado, olha para o Mobile (D-Pad)
    if (newDirection === Direction.NONE) {
      newDirection = this.uiManager.activeDirection
    }

    // 3. Comando local para o GridEngine (Movimento Contínuo)
    if (newDirection !== Direction.NONE) {
      this.gridEngine.move(myId, newDirection)
    }

    // 4. Lógica de Rede (Throttle de intenção)
    if (newDirection !== this.lastDirectionSent) {
      const currentPos = this.gridEngine.getPosition(myId)
      const nextPos =
        newDirection !== Direction.NONE ? calculateNextPos(currentPos, newDirection) : currentPos

      this.socketHandler.sendMove(this.currentRoom.code, newDirection, nextPos)
      this.lastDirectionSent = newDirection
    }
  }
}
