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
    const size = Math.min(width, height) * 0.12
    const padding = 20 // Distância da borda da tela

    // Ponto central exato do D-Pad (ancorado no canto inferior direito)
    const dpadX = width - size * 1.5 - padding
    const dpadY = height - size * 1.5 - padding

    // Distribui os botões em formato de Cruz (+)
    const buttons = [
      { dir: Direction.UP, x: dpadX, y: dpadY - size },
      { dir: Direction.DOWN, x: dpadX, y: dpadY + size },
      { dir: Direction.LEFT, x: dpadX - size, y: dpadY },
      { dir: Direction.RIGHT, x: dpadX + size, y: dpadY },
    ]

    buttons.forEach((btnConfig) => {
      const btn = this.scene.add
        .rectangle(btnConfig.x, btnConfig.y, size - 5, size - 5, 0xffffff, 0.2)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(1000)

      const arrows: any = { UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→' }
      this.scene.add
        .text(btnConfig.x, btnConfig.y, arrows[btnConfig.dir], { fontSize: '24px' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1001)

      btn.on('pointerdown', () => {
        btn.setFillStyle(0xffffff, 0.5)
        this.activeDirection = btnConfig.dir
      })

      const stopMovement = () => {
        btn.setFillStyle(0xffffff, 0.2)
        if (this.activeDirection === btnConfig.dir) {
          this.activeDirection = Direction.NONE
        }
      }

      btn.on('pointerup', stopMovement)
      btn.on('pointerout', stopMovement)
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

    console.log(`[Audio] Iniciando música na sala: ${roomCode}`)

    this.currentMusic.play().catch(() => {
      // Tratamento para políticas de Autoplay do Navegador
      this.showBanner('TAP TO UNMUTE MUSIC')
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
