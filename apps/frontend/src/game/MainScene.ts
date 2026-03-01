import { Scene } from 'phaser'
import { Socket } from 'socket.io-client'
import { GridEngine, Direction } from 'grid-engine'
import { ClientToServerEvents, RoomData, ServerToClientEvents } from '@chasing-chairs/shared'
import { socket } from './socket'

export class MainScene extends Scene {
  private gridEngine!: GridEngine
  private socket!: Socket<ServerToClientEvents, ClientToServerEvents>
  private remotePlayers: { [key: string]: Phaser.GameObjects.Sprite } = {}
  private currentChairSprite: Phaser.GameObjects.Sprite | null = null
  private currentChairPos = { x: -1, y: -1 }
  private currentMusic: HTMLAudioElement | null = null
  private currentRoom!: RoomData
  private worldContainer!: Phaser.GameObjects.Container

  constructor() {
    super('MainScene')
  }

  init(data: { room: RoomData }) {
    // This catches the room data passed from MenuScene
    this.currentRoom = data.room
  }

  private createResetButton() {
    const { width, height } = this.scale
    const centerX = width / 2

    const btn = this.add
      .text(centerX, height * 0.5, 'RESET ROUND', {
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
    const { width, height } = this.scale

    const banner = this.add
      .text(width / 2, height * 0.4, text, {
        fontSize: `${Math.min(width, height) * 0.05}px`, // Scale font to screen
        color: '#ffffff',
        backgroundColor: '#e74c3c',
        padding: { x: 20, y: 10 },
        wordWrap: { width: width * 0.8 }, // Prevent text from going off-screen
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
    const { width, height } = this.scale
    const size = Math.min(width, height) * 0.12 // Dynamic button size
    const padding = 60

    // Position controls in the bottom right
    const centerX = width - size * 2 - padding
    const centerY = height - size * 6 - padding

    const buttons = [
      { dir: Direction.UP, x: centerX + size, y: centerY },
      { dir: Direction.DOWN, x: centerX + size, y: centerY + size * 2 },
      { dir: Direction.LEFT, x: centerX, y: centerY + size },
      { dir: Direction.RIGHT, x: centerX + size * 2, y: centerY + size },
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

  private joinRoomSafe() {
    this.socket.emit(
      'joinRoom',
      this.currentRoom.code,
      this.currentRoom.players[this.socket.id!]?.name || 'Player'
    )

    // Ask the server for the most up-to-date player list immediately
    this.socket.emit('requestSync', this.currentRoom.code)
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

    const mapYOffset = 150

    // 1. Create a Container to hold the world
    // This will be our new 'zero point' for the maze
    const worldContainer = this.add.container(0, mapYOffset)

    // 2. Create the Map & Layer
    const map = this.make.tilemap({ data: mapData, tileWidth: 32, tileHeight: 32 })
    const tileset = map.addTilesetImage('tileTexture', 'tileTexture')

    // 3. Create the Player Sprite
    const playerSprite = this.add.sprite(0, 0, 'playerTexture').setOrigin(0)
    worldContainer.add(playerSprite) // Add to container so it inherits the +150 offset

    if (tileset) map.createLayer(0, tileset, 0, mapYOffset)!

    this.socket = socket
    const myId = this.socket.id!

    const myData = this.currentRoom.players[myId]

    // FALLBACK: If for some reason myId isn't in the object yet, default to 1,1
    const startPos = myData ? myData.position : { x: 1, y: 1 }

    this.gridEngine.create(map, {
      characters: [
        {
          id: this.socket.id!,
          sprite: playerSprite,
          startPosition: startPos,
        },
      ],
    })

    // 5. Store the container for later (we'll need it for the chair!)
    this.worldContainer = worldContainer

    // Add existing players that were already in the room
    Object.values(this.currentRoom.players).forEach((player: any) => {
      if (player.id !== myId) {
        this.addRemotePlayer(player)
      }
    })

    if (this.socket.connected) {
      this.joinRoomSafe()
    } else {
      this.socket.once('connect', () => this.joinRoomSafe())
    }

    this.setupSocketListeners()
    this.createResetButton()
    this.createMobileControls()

    this.gridEngine.movementStopped().subscribe(({ charId }) => {
      // Only check if THE LOCAL PLAYER stopped on the chair
      if (charId === this.socket.id && this.currentChairPos.x !== -1) {
        const pos = this.gridEngine.getPosition(charId)

        if (pos.x === this.currentChairPos.x && pos.y === this.currentChairPos.y) {
          this.socket.emit('playerSat', this.currentRoom.code)
          ;(this.gridEngine.getSprite(charId) as any).setTint(0xffff00)
          this.currentChairPos = { x: -1, y: -1 }
        }
      }
    })

    // NEW: Listen for EVERY tile movement started by the local player
    this.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
      if (charId === this.socket.id) {
        const currentPos = this.gridEngine.getPosition(charId)
        const nextPos = { ...currentPos }

        // Calculate the target tile based on direction
        if (direction === Direction.UP) nextPos.y -= 1
        else if (direction === Direction.DOWN) nextPos.y += 1
        else if (direction === Direction.LEFT) nextPos.x -= 1
        else if (direction === Direction.RIGHT) nextPos.x += 1

        // Send the move to the server for EVERY tile transition
        this.socket.emit('playerMoved', this.currentRoom.code, direction, nextPos)
      }
    })
  }

  private setupSocketListeners() {
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

    this.socket.on('playerMoved', ({ id, direction, position }: any) => {
      if (id === this.socket.id) return // Prevent local echo

      if (this.gridEngine.hasCharacter(id)) {
        // Force the remote character to move in that direction
        this.gridEngine.move(id, direction as Direction)

        // If the server sent a specific position, verify it when they stop
        // This acts as a 'correction' if they get out of sync
        this.gridEngine.movementStopped().subscribe(({ charId }) => {
          if (charId === id && position) {
            const currentPos = this.gridEngine.getPosition(id)
            if (currentPos.x !== position.x || currentPos.y !== position.y) {
              this.gridEngine.setPosition(id, position)
            }
          }
        })
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
      // Use 0,0 relative to container (no manual +150 here!)
      this.currentChairSprite = this.add.sprite(pos.x * 32, pos.y * 32, 'chairTexture').setOrigin(0)
      this.worldContainer.add(this.currentChairSprite) // <--- Add this!
    })

    this.socket.on('chairTaken', (id: string) => {
      const myId = this.socket.id!

      if (id === 'RESET') {
        this.showBanner('ROUND RESETTING...')
      } else {
        const msg = id === myId ? 'YOU WON THE CHAIR!' : 'TOO SLOW!'
        this.showBanner(msg)
      }

      if (this.currentChairSprite) {
        this.currentChairSprite.destroy()
        this.currentChairSprite = null
      }
      this.currentChairPos = { x: -1, y: -1 }

      // Reset my own tint
      const mySprite = this.gridEngine.getSprite(this.socket.id!) as any
      if (mySprite) mySprite.clearTint()

      // Reset all remote tints
      Object.keys(this.remotePlayers).forEach((remoteId) => {
        const remoteSprite = this.gridEngine.getSprite(remoteId) as any
        if (remoteSprite) remoteSprite.clearTint()
      })
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

    this.socket.on('gameStarted', (serverPlayers: any) => {
      this.showBanner('MUSIC STARTING...')

      Object.values(serverPlayers).forEach((p: any) => {
        if (this.gridEngine.hasCharacter(p.id)) {
          // SNAP everyone to their official server position
          this.gridEngine.setPosition(p.id, p.position)
        } else if (p.id !== this.socket.id) {
          this.addRemotePlayer(p)
        }
      })
    })
  }

  private addRemotePlayer(data: any) {
    if (!this.sys || this.remotePlayers[data.id]) return

    const sprite = this.add.sprite(0, 0, 'remoteTexture').setOrigin(0)
    this.worldContainer.add(sprite) // <--- Add this!

    this.gridEngine.addCharacter({
      id: data.id,
      sprite: sprite,
      startPosition: data.position,
    })

    this.remotePlayers[data.id] = sprite
  }

  update() {
    if (!this.socket || !this.socket.connected) return

    const cursors = this.input.keyboard!.createCursorKeys()
    if (cursors.left.isDown) this.gridEngine.move(this.socket.id!, Direction.LEFT)
    else if (cursors.right.isDown) this.gridEngine.move(this.socket.id!, Direction.RIGHT)
    else if (cursors.up.isDown) this.gridEngine.move(this.socket.id!, Direction.UP)
    else if (cursors.down.isDown) this.gridEngine.move(this.socket.id!, Direction.DOWN)
  }

  private sendMove(direction: Direction) {
    const myId = this.socket.id!

    // GridEngine's isMoving check is crucial here
    if (this.gridEngine.isMoving(myId)) return

    const currentPos = this.gridEngine.getPosition(myId)
    const nextPos = { ...currentPos }

    if (direction === Direction.UP) nextPos.y -= 1
    else if (direction === Direction.DOWN) nextPos.y += 1
    else if (direction === Direction.LEFT) nextPos.x -= 1
    else if (direction === Direction.RIGHT) nextPos.x += 1

    this.gridEngine.move(myId, direction)
  }
}
