import { Scene } from 'phaser'
import { socket } from './socket'
import { RoomData } from '@chasing-chairs/shared'

const MAX_ROOM_SIZE = 4
const MIN_ROOM_SIZE = 1

export class MenuScene extends Scene {
  private nameInput!: Phaser.GameObjects.DOMElement
  private codeInput!: Phaser.GameObjects.DOMElement
  private lobbyText!: Phaser.GameObjects.Text
  private createBtn!: Phaser.GameObjects.Text
  private joinBtn!: Phaser.GameObjects.Text
  private playersToggleBtn!: Phaser.GameObjects.Text

  private mySavedRoomData!: RoomData
  private roomSize: number = 1

  constructor() {
    super('MenuScene')
  }

  create() {
    const { width, height } = this.scale
    const centerX = width / 2

    // Title
    this.add
      .text(centerX, height * 0.15, 'CHASING CHAIRS', {
        fontSize: `${Math.min(width, height) * 0.08}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5)

    const inputStyle = `width: ${width * 0.6}px; max-width: 250px; height: 35px; text-align: center;`

    // --- SESSÃO DE CRIAÇÃO (Subiu um pouco para dar espaço) ---
    this.nameInput = this.add.dom(centerX, height * 0.28, 'input', inputStyle)
    // @ts-expect-error - Direct DOM modification - It will be changed later
    this.nameInput.node.placeholder = 'Your Name'

    // NOVO: Botão de Seleção de Jogadores
    this.playersToggleBtn = this.add
      .text(centerX, height * 0.38, `< PLAYERS: ${this.roomSize} >`, {
        fontSize: '22px',
        color: '#ffaa00',
      })
      .setOrigin(0.5)
      .setInteractive()

    this.createBtn = this.add
      .text(centerX, height * 0.48, '[ CREATE ROOM ]', {
        fontSize: '24px',
        color: '#0f0',
      })
      .setOrigin(0.5)
      .setInteractive()

    // --- SESSÃO DE ENTRADA (Desceu um pouco) ---
    this.codeInput = this.add.dom(centerX, height * 0.62, 'input', inputStyle)
    // @ts-expect-error - Direct DOM modification - It will be changed later
    this.codeInput.node.placeholder = 'Room Code (to join)'
    // @ts-expect-error - Direct DOM modification - It will be changed later
    this.codeInput.node.maxLength = 4

    this.joinBtn = this.add
      .text(centerX, height * 0.72, '[ JOIN ROOM ]', {
        fontSize: '24px',
        color: '#0ff',
      })
      .setOrigin(0.5)
      .setInteractive()

    this.lobbyText = this.add
      .text(centerX, height * 0.72, '', {
        fontSize: '22px',
        color: '#ff0',
        align: 'center',
        wordWrap: { width: width * 0.6 },
      })
      .setOrigin(0.5)

    // --- LÓGICA DE CLIQUES ---

    // Lógica do Toggle (Gira entre 2, 3 e 4)
    this.playersToggleBtn.on('pointerdown', () => {
      this.roomSize = this.roomSize >= MAX_ROOM_SIZE ? MIN_ROOM_SIZE : this.roomSize + 1
      this.playersToggleBtn.setText(`< PLAYERS: ${this.roomSize} >`)
    })

    this.createBtn.on('pointerdown', () => {
      const name = (this.nameInput.node as HTMLInputElement).value
      if (name.trim()) {
        socket.emit('createRoom', name, this.roomSize)
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
      this.mySavedRoomData = roomData
      this.showLobbyUI(roomData.code)
    })

    socket.on('error', (msg) => {
      alert(`Error: ${msg}`)
    })

    socket.on('gameStarted', () => {
      if (this.mySavedRoomData) {
        this.cleanupAndStart(this.mySavedRoomData)
      }
    })
  }

  private showLobbyUI(code: string) {
    this.nameInput.setVisible(false)
    this.codeInput.setVisible(false)
    this.createBtn.setVisible(false)
    this.joinBtn.setVisible(false)
    this.playersToggleBtn.setVisible(false) // Esconde o seletor também

    // Como o maxPlayers agora vem do servidor, podemos mostrar no lobby!
    const currentPlayers = Object.keys(this.mySavedRoomData.players).length
    this.lobbyText.setText(
      `LOBBY: ${code}\nPlayers: ${currentPlayers}/${this.mySavedRoomData.size}\nWaiting for all players...`
    )
  }

  private cleanupAndStart(roomData: RoomData) {
    socket.off('roomCreated')
    socket.off('roomJoined')
    socket.off('gameStarted')
    socket.off('error')
    this.scene.start('MainScene', { room: roomData })
  }
}
