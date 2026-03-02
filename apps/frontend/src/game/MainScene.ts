import { Scene } from 'phaser'
import { GridEngine, Direction } from 'grid-engine'
import { RoomData } from '@chasing-chairs/shared'
import { socket } from './socket'
import { calculateNextPos } from '../utils/gridUtils'
import { SocketHandler, UIManager, MazeManager, ScoreboardManager, ScoreData } from './managers'
import { Player, Chair } from './entitites'

export class MainScene extends Scene {
  private gridEngine!: GridEngine
  private socketHandler!: SocketHandler
  private uiManager!: UIManager
  private mazeManager!: MazeManager
  private scoreboardManager!: ScoreboardManager
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

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
    this.scoreboardManager = new ScoreboardManager(this, this.socketHandler.id!)
    this.cursors = this.input.keyboard!.createCursorKeys()

    // 1. Constrói o labirinto com o mapa gerado pelo servidor!
    this.mazeManager.buildMaze(this.currentRoom.mapData)

    // 2. O backend já nos deu uma posição válida (myData.position)
    const myId = this.socketHandler.id!
    const myData = this.currentRoom.players[myId]

    // Passamos a posição sorteada pelo servidor para o Player
    const localPlayer = new Player(
      this,
      this.gridEngine,
      myId,
      myData.position,
      'playerTexture',
      this.mazeManager
    )
    this.players.set(myId, localPlayer)

    // 3. Adiciona os jogadores remotos (que também já vêm com a posição correta)
    Object.values(this.currentRoom.players).forEach((p: any) => {
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

      this.refreshScoreboard(serverPlayers)
    })

    // No Frontend: MainScene.ts

    this.events.on('net:gameStarted', () => {
      console.log('[Game] Nova rodada iniciada!')

      // 1. Limpa a cadeira antiga da tela e da memória
      if (this.chair) {
        this.chair.destroy()
        this.chair = null
      }

      // 2. Limpa o "brilho" de vencedor de todos os jogadores para a nova rodada
      this.players.forEach((player) => {
        player.clearTint()
      })

      // 3. (Opcional) Mostra um banner de "Música começando..."
      this.uiManager.showBanner('A MÚSICA VAI COMEÇAR!')
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

    this.events.on('net:musicStarted', (data: { url: string }) =>
      this.uiManager.handleMusic(data.url, this.currentRoom.code)
    )

    this.events.on('net:musicStopped', () => {
      console.log('[Audio] Parando a música porque a cadeira nasceu!')
      this.uiManager.stopMusic()
    })

    // IMPORTANTE: Se o jogador sair da sala ou a cena fechar, pare a música!
    this.events.on('shutdown', () => {
      this.uiManager.stopMusic()
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

    this.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
      if (charId === this.socketHandler.id) {
        const currentPos = this.gridEngine.getPosition(charId)
        const nextPos = calculateNextPos(currentPos, direction)
        this.socketHandler.sendMove(this.currentRoom.code, direction, nextPos)
      }
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

      // Feedback visual e desativa a cadeira localmente para evitar spam
      const myPlayer = this.players.get(this.socketHandler.id)
      if (myPlayer) myPlayer.setWinnerTint()

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
      this.mazeManager
    )
    this.players.set(data.id, remotePlayer)
  }

  update() {
    if (!this.socketHandler?.id) return

    // CORREÇÃO DO BUG: JustDown garante que o evento dispare apenas 1 vez por clique
    // O jogador precisa soltar a tecla e apertar de novo para andar mais um bloco.
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left))
      this.gridEngine.move(this.socketHandler.id, Direction.LEFT)
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.right))
      this.gridEngine.move(this.socketHandler.id, Direction.RIGHT)
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.up))
      this.gridEngine.move(this.socketHandler.id, Direction.UP)
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.down))
      this.gridEngine.move(this.socketHandler.id, Direction.DOWN)
  }
}
