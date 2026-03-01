import { Scene } from 'phaser'
import { io, Socket } from 'socket.io-client'
import { GridEngine, Direction } from 'grid-engine'
import { ServerToClientEvents, ClientToServerEvents, RoomData } from '@chasing-chairs/shared'

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

export class MainScene extends Scene {
  private gridEngine!: GridEngine
  private socket!: Socket<ServerToClientEvents, ClientToServerEvents>
  private remotePlayers: { [key: string]: Phaser.GameObjects.Sprite } = {}
  private currentChairSprite: Phaser.GameObjects.Sprite | null = null
  private currentChairPos = { x: -1, y: -1 }
  private currentMusic: HTMLAudioElement | null = null
  private currentRoom!: RoomData

  constructor() {
    super('MainScene')
  }

  init(data: { room: RoomData }) {
    // This catches the room data passed from MenuScene
    this.currentRoom = data.room
  }

  private createResetButton() {
    const btn = this.add
      .text(780, 580, 'RESET ROUND', {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#34495e',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(1)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })

    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#2c3e50' }))
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#34495e' }))

    btn.on('pointerdown', () => {
      // OBSERVATION: Restart now needs the room code!
      this.socket.emit('restartRound', this.currentRoom.code)
      btn.setStyle({ backgroundColor: '#16a085' })
    })
  }

  private showBanner(text: string) {
    const banner = this.add
      .text(400, 100, text, {
        fontSize: '48px',
        color: '#ffffff',
        backgroundColor: '#e74c3c',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)

    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 2000,
      duration: 500,
      onComplete: () => banner.destroy(),
    })
  }

  private createMobileControls() {
    const { height } = this.scale
    const size = 60
    const padding = 20
    const centerX = size * 1.5 + padding
    const centerY = height - (size * 1.5 + padding)

    const buttons = [
      { dir: Direction.UP, x: centerX, y: centerY - size },
      { dir: Direction.DOWN, x: centerX, y: centerY + size },
      { dir: Direction.LEFT, x: centerX - size, y: centerY },
      { dir: Direction.RIGHT, x: centerX + size, y: centerY },
    ]

    buttons.forEach((btnConfig) => {
      const btn = this.add
        .rectangle(btnConfig.x, btnConfig.y, size - 5, size - 5, 0xffffff, 0.2)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(1000)

      const arrows: any = { UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→' }
      this.add
        .text(btnConfig.x, btnConfig.y, arrows[btnConfig.dir], { fontSize: '32px' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1001)

      btn.on('pointerdown', () => {
        btn.setFillStyle(0xffffff, 0.5)
        this.sendMove(btnConfig.dir)
      })

      btn.on('pointerup', () => btn.setFillStyle(0xffffff, 0.2))
      btn.on('pointerout', () => btn.setFillStyle(0xffffff, 0.2))
    })
  }

  preload() {
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

    // Generate a simple chair texture so it doesn't crash
    const chairGraphic = this.make.graphics({ x: 0, y: 0 })
    chairGraphic.fillStyle(0xffff00, 1)
    chairGraphic.fillRect(4, 4, 24, 24)
    chairGraphic.generateTexture('chairTexture', 32, 32)

    this.load.audio('alert', 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg')
  }

  create() {
    const mapData = [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ]

    console.log(`Game starting in room: ${this.currentRoom.code}`)

    const map = this.make.tilemap({ data: mapData, tileWidth: 32, tileHeight: 32 })
    const tileset = map.addTilesetImage('tileTexture', 'tileTexture')
    if (tileset) map.createLayer(0, tileset, 0, 0)

    const playerSprite = this.add.sprite(0, 0, 'playerTexture').setOrigin(0)

    this.gridEngine.create(map, {
      characters: [{ id: 'player1', sprite: playerSprite, startPosition: { x: 1, y: 1 } }],
    })

    // Setup Socket
    this.socket = io(socketUrl)
    this.setupSocketListeners()
    this.createResetButton()
    this.createMobileControls()

    this.gridEngine.movementStopped().subscribe(({ charId }) => {
      if (charId === 'player1' && this.currentChairPos.x !== -1) {
        const pos = this.gridEngine.getPosition('player1')

        if (pos.x === this.currentChairPos.x && pos.y === this.currentChairPos.y) {
          // OBSERVATION: Sitting now needs to tell the server which room the chair was in!
          this.socket.emit('playerSat', this.currentRoom.code)
          ;(this.gridEngine.getSprite('player1') as any).setTint(0xffff00)
          this.currentChairPos = { x: -1, y: -1 }
        }
      }
    })
  }

  private setupSocketListeners() {
    // Tell the server we are ready in this specific room
    // The server will then send us 'updatedPlayers' for this room only
    if (this.socket.id)
      this.socket.emit(
        'joinRoom',
        this.currentRoom.code,
        this.currentRoom.players[this.socket.id]?.name || 'Player'
      )

    this.socket.on('updatedPlayers', (players: any) => {
      Object.values(players).forEach((p: any) => {
        if (p.id !== this.socket.id) {
          this.addRemotePlayer(p)
        }
      })
    })

    this.socket.on('playerJoined', (data: any) => {
      this.addRemotePlayer(data)
    })

    this.socket.on('playerMoved', ({ id, direction }: { id: string; direction: string }) => {
      if (this.remotePlayers[id]) {
        this.gridEngine.move(id, direction as Direction)
      }
    })

    this.socket.on('playerDisconnected', (id: string) => {
      if (this.remotePlayers[id]) {
        this.gridEngine.removeCharacter(id)
        this.remotePlayers[id].destroy()
        delete this.remotePlayers[id]
      }
    })

    this.socket.on('chairSpawned', (pos: { x: number; y: number }) => {
      if (this.currentMusic) {
        this.currentMusic.pause()
        this.currentMusic = null
      }
      this.sound.play('alert')
      this.showBanner('CHAIR APPEARED! RUN!')
      this.currentChairPos = pos

      if (this.currentChairSprite) this.currentChairSprite.destroy()
      this.currentChairSprite = this.add.sprite(pos.x * 32, pos.y * 32, 'chairTexture').setOrigin(0)
    })

    this.socket.on('chairTaken', (id: string) => {
      if (id === 'RESET') {
        this.showBanner('ROUND RESETTING...')
      } else {
        const msg = id === this.socket.id ? 'YOU WON THE CHAIR!' : 'TOO SLOW!'
        this.showBanner(msg)
      }

      if (this.currentChairSprite) {
        this.currentChairSprite.destroy()
        this.currentChairSprite = null
      }
      this.currentChairPos = { x: -1, y: -1 }

      if (id !== this.socket.id) {
        ;(this.gridEngine.getSprite('player1') as any).clearTint()
      }
    })

    this.socket.on('musicStarted', (data: { url: string }) => {
      if (!this.currentMusic) {
        this.currentMusic = new Audio()
      }
      this.currentMusic.src = data.url
      this.currentMusic.load()
      this.currentMusic.play().catch(() => {
        this.input.once('pointerdown', () => this.currentMusic?.play())
      })
    })
  }

  private addRemotePlayer(data: any) {
    if (!this.sys || !this.sys.isActive() || !this.add || this.remotePlayers[data.id]) return

    const sprite = this.add.sprite(0, 0, 'remoteTexture').setOrigin(0)
    this.gridEngine.addCharacter({
      id: data.id,
      sprite: sprite,
      startPosition: { x: data.position.x, y: data.position.y },
    })
    this.remotePlayers[data.id] = sprite
  }

  update() {
    if (!this.socket || !this.socket.connected) return

    const cursors = this.input.keyboard!.createCursorKeys()
    if (cursors.left.isDown) this.sendMove(Direction.LEFT)
    else if (cursors.right.isDown) this.sendMove(Direction.RIGHT)
    else if (cursors.up.isDown) this.sendMove(Direction.UP)
    else if (cursors.down.isDown) this.sendMove(Direction.DOWN)
  }

  private sendMove(direction: Direction) {
    // FIXED: Changed this.sprite.name to 'player1' to match your create() setup
    if (this.gridEngine.isMoving('player1')) return

    // OBSERVATION: Movement now needs the room code!
    this.socket.emit('playerMoved', this.currentRoom.code, direction)
  }
}
