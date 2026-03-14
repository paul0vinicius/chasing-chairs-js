import { Scene } from 'phaser'
import { GridEngine, Direction } from 'grid-engine'
import {
  DirectionIdToName,
  MovePayload,
  PlayerMapper,
  RoomData,
  AnimState,
} from '@chasing-chairs/shared'
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

    // No MainScene.ts

    this.events.on('net:s', (payload: MovePayload[]) => {
      payload.forEach((playerData) => {
        const { id, x, y, dir, anim } = PlayerMapper.deserializeMove(playerData)

        // 1. Ignora o jogador local (nós já temos predição local no update)
        if (id === this.socketHandler.id) {
          const myPos = this.gridEngine.getPosition(id)
          if (Phaser.Math.Distance.Between(myPos.x, myPos.y, x, y) > 2) {
            this.gridEngine.setPosition(id, { x, y })
          }
          return
        }

        // 2. Garante que o jogador remoto existe na cena
        if (!this.players.has(id)) {
          // Se por acaso um novo player entrou e não pegamos o evento de join
          this.addRemotePlayer(this.currentRoom.players[id])
          return
        }

        const remotePlayer = this.players.get(id)!

        if (this.gridEngine.hasCharacter(id)) {
          const directionName = DirectionIdToName[dir] as Direction
          const serverPos = { x, y }

          // 3. MOVIMENTO SUAVE (Interpolação do GridEngine)
          // Se o servidor diz que ele está se mexendo, mandamos o GridEngine mover.
          // O GridEngine cuidará de deslizar o sprite entre os tiles.
          if (directionName !== Direction.NONE) {
            this.gridEngine.move(id, directionName)
          }

          // 4. RECONCILIAÇÃO DE ESTADO (Ajuste de "Ghosting")
          const currentPos = this.gridEngine.getPosition(id)
          const dist = Phaser.Math.Distance.Between(
            currentPos.x,
            currentPos.y,
            serverPos.x,
            serverPos.y
          )

          // Se a diferença for pequena (ex: < 0.5 tile), ignoramos e deixamos o GridEngine terminar a animação.
          // Se a diferença for grande (> 1.2 tiles), houve lag pesado, então teleportamos para corrigir.
          if (dist > 1.2) {
            this.gridEngine.setPosition(id, serverPos)
          }

          // 5. ATUALIZAÇÃO DE ANIMAÇÕES (Opcional, baseado no AnimState)
          this.handleRemoteAnimation(remotePlayer, anim as AnimState)
        }
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

    this.events.on('net:gameOver', (finalPlayers: any) => {
      this.uiManager.showGameOverScreen(finalPlayers, this.currentRoom.code)
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
        const nextPos = calculateNextPos(currentPos, direction)

        // Avisa o servidor: "Estou andando de fato"
        this.socketHandler.sendMove(this.currentRoom.code, direction, nextPos)
        this.lastDirectionSent = direction
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
    if (this.cursors.left.isDown || this.uiManager.activeDirection === Direction.LEFT)
      newDirection = Direction.LEFT
    else if (this.cursors.right.isDown || this.uiManager.activeDirection === Direction.RIGHT)
      newDirection = Direction.RIGHT
    else if (this.cursors.up.isDown || this.uiManager.activeDirection === Direction.UP)
      newDirection = Direction.UP
    else if (this.cursors.down.isDown || this.uiManager.activeDirection === Direction.DOWN)
      newDirection = Direction.DOWN

    if (newDirection !== Direction.NONE) {
      this.gridEngine.move(myId, newDirection)
    } else {
      // Importante: Se não há tecla, paramos o movimento localmente
      this.gridEngine.stopMovement(myId)
    }
  }
}
