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
      this.mySavedRoomData = room
      this.showLobbyUI(room.code)
    })

    socket.on('roomJoined', (roomData) => {
      // GUEST: Save the data, but DON'T start the scene yet!
      this.mySavedRoomData = roomData
      this.showLobbyUI(roomData.code)
      console.log('Joined lobby, waiting for host or 2nd player...')
    })

    socket.on('error', (msg) => {
      alert(`Error: ${msg}`)
    })

    socket.on('gameStarted', () => {
      // BOTH: Once the server says the room is full/ready, everyone enters at once
      if (this.mySavedRoomData) {
        this.cleanupAndStart(this.mySavedRoomData)
      }
    })
  }

  // Helper to hide buttons and show the code
  private showLobbyUI(code: string) {
    this.nameInput.setVisible(false)
    this.codeInput.setVisible(false)
    // Hide your buttons here too

    this.add
      .text(400, 300, `LOBBY: ${code}\nWaiting for all players...`, {
        fontSize: '32px',
        color: '#fff',
        align: 'center',
      })
      .setOrigin(0.5)
  }

  private cleanupAndStart(roomData: RoomData) {
    socket.off('roomCreated')
    socket.off('roomJoined')
    socket.off('gameStarted')
    socket.off('error')
    this.scene.start('MainScene', { room: roomData })
  }
}
