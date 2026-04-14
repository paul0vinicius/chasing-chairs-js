import { Scene } from 'phaser'
import { Direction, GridEngine } from 'grid-engine'
import { SocketHandler } from '../socketHandler'

export class UIManager {
  private scene: Scene
  private socketHandler: SocketHandler
  private gridEngine: GridEngine
  private currentMusic: HTMLAudioElement | null = null
  private musicKey: string | null = null
  public activeDirection: Direction = Direction.NONE

  constructor(scene: Scene, socketHandler: SocketHandler, gridEngine: GridEngine) {
    this.scene = scene
    this.socketHandler = socketHandler
    this.gridEngine = gridEngine
  }

  public showBanner(text: string) {
    const { width, height } = this.scene.scale

    // Dimensões responsivas do banner
    const bannerWidth = width * 0.85
    const bannerHeight = Math.max(60, height * 0.12)
    const centerY = height * 0.3 // Fica na parte superior-central da tela

    // 1. A Sombra Dura (Drop Shadow Estilo Retro)
    const shadow = this.scene.add
      .rectangle(width / 2 + 6, centerY + 6, bannerWidth, bannerHeight, 0x000000, 1)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(99)

    // 2. Fundo Translúcido Escuro com Borda Branca Grossa
    const bg = this.scene.add
      .rectangle(width / 2, centerY, bannerWidth, bannerHeight, 0x000000, 0.8)
      .setStrokeStyle(4, 0xffffff, 1)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)

    // 3. O Texto Centralizado com a Fonte Pixelada
    // IMPORTANTE: Coloque o mesmo nome da font-family que você usa no seu arquivo CSS
    const bannerText = this.scene.add
      .text(width / 2, centerY, text.toUpperCase(), {
        fontFamily: '"Press Start 2P", Courier, monospace', // Ajuste para a sua font-pixel
        fontSize: `${Math.min(width, height) * 0.045}px`,
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: bannerWidth - 20 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101)

    // 4. Animação de Fade Out que destrói todos os 3 elementos no final
    this.scene.tweens.add({
      targets: [shadow, bg, bannerText],
      alpha: 0,
      delay: 2000,
      duration: 500,
      onComplete: () => {
        shadow.destroy()
        bg.destroy()
        bannerText.destroy()
      },
    })
  }

  public createControls() {
    const isDesktop = this.scene.sys.game.device.os.desktop
    if (isDesktop) return

    const { width, height } = this.scene.scale
    const size = Math.min(width, height) * 0.15
    const padding = 20

    const dpadX = width - size * 1.5 - padding
    const dpadY = height - size * 1.5 - padding

    const buttons = [
      { dir: Direction.UP, x: dpadX, y: dpadY - size, arrow: '↑' },
      { dir: Direction.DOWN, x: dpadX, y: dpadY + size, arrow: '↓' },
      { dir: Direction.LEFT, x: dpadX - size, y: dpadY, arrow: '←' },
      { dir: Direction.RIGHT, x: dpadX + size, y: dpadY, arrow: '→' },
    ]

    buttons.forEach((btnConfig) => {
      const shadow = this.scene.add
        .rectangle(btnConfig.x + 4, btnConfig.y + 4, size, size, 0x000000, 1)
        .setScrollFactor(0)
        .setDepth(999)

      // 2. O Botão
      const btn = this.scene.add
        .rectangle(btnConfig.x, btnConfig.y, size, size, 0x000000, 0.7)
        .setStrokeStyle(4, 0xffffff)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(1000)

      const txt = this.scene.add
        .text(btnConfig.x, btnConfig.y, btnConfig.arrow, {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${size * 0.6}px`,
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1001)

      // 4. Lógica de Interação Refinada
      btn.on('pointerdown', () => {
        // Inversão de cores agressiva
        btn.setFillStyle(0xffffff, 1)
        txt.setTint(0x000000) // Usar setTint é mais garantido no Phaser para objetos de texto

        this.activeDirection = btnConfig.dir

        // Efeito de feedback visual
        btn.y = btnConfig.y + 3
        txt.y = btnConfig.y + 3
        shadow.alpha = 0 // Esconde a sombra para parecer que encostou no chão
      })

      const resetBtn = () => {
        btn.setFillStyle(0x000000, 0.7)
        txt.clearTint() // Volta para a cor original (branco)
        txt.setColor('#ffffff')

        btn.y = btnConfig.y
        txt.y = btnConfig.y
        shadow.alpha = 1

        if (this.activeDirection === btnConfig.dir) {
          this.activeDirection = Direction.NONE
        }
      }

      btn.on('pointerup', resetBtn)
      btn.on('pointerout', resetBtn)
    })
  }

  public handleMusic(url: string, roomCode: string) {
    // 1. Se já houver música tocando, paramos antes de iniciar a nova
    this.stopMusic()

    // 2. Criamos uma chave única combinando URL, Sala e um Timestamp
    // Isso força o navegador a tratar como uma nova requisição/instância
    this.musicKey = `${roomCode}_${url.split('/').pop()}_${Date.now()}`

    this.currentMusic = new Audio(url)
    this.currentMusic.id = this.musicKey // Atribuímos o ID único ao elemento
    this.currentMusic.volume = 0.5

    console.log(`[Audio] Iniciando música na sala: ${roomCode}`)

    this.currentMusic.play().catch(() => {
      this.scene.input.once('pointerdown', () => {
        this.currentMusic?.play()
      })
    })
  }

  public stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause()
      this.currentMusic.currentTime = 0 // Reseta para o início
      this.currentMusic = null
      this.musicKey = null
      console.log('[Audio] Música interrompida.')
    }
  }

  private leaveRoom() {
    this.stopMusic()
    this.socketHandler.disconnect()
    this.socketHandler.connect()
    this.scene.scene.start('MenuScene')
  }

  private stayInRoom(
    overlay: Phaser.GameObjects.Graphics,
    uiElements: Phaser.GameObjects.GameObject[],
    roomCode: string
  ) {
    overlay.destroy()
    uiElements.forEach((el) => el.destroy())

    this.showBanner('ESPERANDO OS OUTROS JOGADORES...')

    this.socketHandler.startNewGame(roomCode)
  }
}
