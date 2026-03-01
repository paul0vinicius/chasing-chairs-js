import { Scene } from 'phaser'
import { socket } from './socket'
import { RoomData } from '@chasing-chairs/shared'

export class MenuScene extends Scene {
  private nameInput!: Phaser.GameObjects.DOMElement
  private codeInput!: Phaser.GameObjects.DOMElement
  private mySavedRoomData!: RoomData

  constructor() {
    super('MenuScene')
  }

  create() {
    const { width, height } = this.scale

    // Title
    this.add
      .text(width / 2, height * 0.2, 'CHASING CHAIRS', {
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    // --- INPUT FIELDS ---
    // Player Name Input
    this.nameInput = this.add
      .dom(
        width / 2,
        height * 0.4,
        'input',
        `
      width: 200px; 
      height: 30px; 
      font-size: 16px; 
      text-align: center;
    `
      )
      .addListener('focus')
    // @ts-expect-error - Phaser DOM elements hide some native properties
    this.nameInput.node.placeholder = 'Enter your Name'

    // Room Code Input (for joining)
    this.codeInput = this.add.dom(
      width / 2,
      height * 0.6,
      'input',
      `
      width: 200px; 
      height: 30px; 
      font-size: 16px; 
      text-align: center;
      text-transform: uppercase;
    `
    )
    // @ts-expect-error - Phaser DOM elements hide some native properties
    this.codeInput.node.placeholder = 'Room Code (to join)'
    // @ts-expect-error - Phaser DOM elements hide some native properties
    this.codeInput.node.maxLength = 4

    // --- BUTTONS ---
    // Create Room Button
    const createBtn = this.add
      .text(width / 2, height * 0.5, '[ CREATE ROOM ]', {
        fontSize: '24px',
        color: '#0f0',
      })
      .setOrigin(0.5)
      .setInteractive()

    createBtn.on('pointerdown', () => {
      const name = (this.nameInput.node as HTMLInputElement).value
      if (name.trim()) {
        socket.emit('createRoom', name)
      } else {
        alert('Please enter a name first!')
      }
    })

    // Join Room Button
    const joinBtn = this.add
      .text(width / 2, height * 0.7, '[ JOIN ROOM ]', {
        fontSize: '24px',
        color: '#0ff',
      })
      .setOrigin(0.5)
      .setInteractive()

    joinBtn.on('pointerdown', () => {
      const name = (this.nameInput.node as HTMLInputElement).value
      const code = (this.codeInput.node as HTMLInputElement).value.toUpperCase()
      if (name.trim() && code.trim().length === 4) {
        socket.emit('joinRoom', code, name)
      } else {
        alert('Enter a valid name and 4-letter code!')
      }
    })

    // --- SOCKET LISTENERS ---
    socket.on('roomCreated', (room) => {
      console.log(`Room created! Code: ${room.code}`)
      this.mySavedRoomData = room
      // Show the code to the host so they can share it
      this.add
        .text(width / 2, height * 0.85, `Waiting for players...\nCode: ${room.code}`, {
          fontSize: '24px',
          color: '#ff0',
          align: 'center',
        })
        .setOrigin(0.5)
    })

    socket.on('roomJoined', (roomData) => {
      console.log('Joined room:', roomData)
      // Clean up socket listeners so they don't fire twice
      socket.removeAllListeners('roomCreated')
      socket.removeAllListeners('roomJoined')
      socket.removeAllListeners('error')

      // Transition to the game scene and pass the room data
      this.scene.start('MainScene', { room: roomData })
    })

    socket.on('error', (msg) => {
      alert(`Error: ${msg}`)
    })

    socket.on('gameStarted', () => {
      // If the host is still on the MenuScene, push them into the MainScene
      if (this.scene.isActive('MenuScene')) {
        // Note: You'll need to store the roomData locally in MenuScene when roomCreated fires
        this.scene.start('MainScene', { room: this.mySavedRoomData })
      }
    })
  }
}
