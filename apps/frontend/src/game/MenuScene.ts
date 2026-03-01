import { Scene } from 'phaser'
import { socket } from './socket'
import { RoomData } from '@chasing-chairs/shared'

export class MenuScene extends Scene {
  private nameInput!: Phaser.GameObjects.DOMElement
  private codeInput!: Phaser.GameObjects.DOMElement
  private lobbyText!: Phaser.GameObjects.Text
  private createBtn!: Phaser.GameObjects.Text
  private joinBtn!: Phaser.GameObjects.Text
  private mySavedRoomData!: RoomData

  constructor() {
    super('MenuScene')
  }

  create() {
    const { width, height } = this.scale
    const centerX = width / 2

    // Title - Positioned at 15% of screen height
    this.add
      .text(centerX, height * 0.15, 'CHASING CHAIRS', {
        fontSize: `${Math.min(width, height) * 0.08}px`, // Dynamic font size
        color: '#ffffff',
      })
      .setOrigin(0.5)

    // Inputs - Using width percentages and max-widths
    const inputStyle = `width: ${width * 0.6}px; max-width: 250px; height: 35px; text-align: center;`

    this.nameInput = this.add.dom(centerX, height * 0.35, 'input', inputStyle)
    this.codeInput = this.add.dom(centerX, height * 0.55, 'input', inputStyle)

    // @ts-expect-error - Phaser DOM elements hide some native properties
    this.codeInput.node.placeholder = 'Room Code (to join)'
    // @ts-expect-error - Phaser DOM elements hide some native properties
    this.codeInput.node.maxLength = 4

    // --- BUTTONS ---
    // Buttons - Using percentages to stay clear of inputs
    this.createBtn = this.add
      .text(centerX, height * 0.45, '[ CREATE ROOM ]', {
        fontSize: '24px',
        color: '#0f0',
      })
      .setOrigin(0.5)
      .setInteractive()

    this.joinBtn = this.add
      .text(centerX, height * 0.65, '[ JOIN ROOM ]', {
        fontSize: '24px',
        color: '#0ff',
      })
      .setOrigin(0.5)
      .setInteractive()

    // Lobby Status (The text in your 4th screenshot)
    // We use wordWrap to ensure it doesn't bleed off the edges
    this.lobbyText = this.add
      .text(centerX, height * 0.65, '', {
        fontSize: '22px',
        color: '#ff0',
        align: 'center',
        wordWrap: { width: width * 0.9 },
      })
      .setOrigin(0.5)

    this.createBtn.on('pointerdown', () => {
      const name = (this.nameInput.node as HTMLInputElement).value
      if (name.trim()) {
        socket.emit('createRoom', name)
      } else {
        alert('Please enter a name first!')
      }
    })

    this.joinBtn.on('pointerdown', () => {
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
    this.createBtn.setVisible(false)
    this.joinBtn.setVisible(false)

    // Update the existing lobbyText instead of creating a new one
    this.lobbyText.setText(`LOBBY: ${code}\nWaiting for all players...`)
  }

  private cleanupAndStart(roomData: RoomData) {
    socket.off('roomCreated')
    socket.off('roomJoined')
    socket.off('gameStarted')
    socket.off('error')
    this.scene.start('MainScene', { room: roomData })
  }
}
