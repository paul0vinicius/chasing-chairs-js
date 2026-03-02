import { Scene } from 'phaser'
import { Direction, GridEngine } from 'grid-engine'
import { SocketHandler } from '../socketHandler'

export class UIManager {
  private scene: Scene
  private socketHandler: SocketHandler
  private gridEngine: GridEngine
  private currentMusic: HTMLAudioElement | null = null
  private musicKey: string | null = null

  constructor(scene: Scene, socketHandler: SocketHandler, gridEngine: GridEngine) {
    this.scene = scene
    this.socketHandler = socketHandler
    this.gridEngine = gridEngine
  }

  public showBanner(text: string) {
    const { width, height } = this.scene.scale
    const banner = this.scene.add
      .text(width / 2, height * 0.4, text, {
        fontSize: `${Math.min(width, height) * 0.05}px`,
        color: '#ffffff',
        backgroundColor: '#e74c3c',
        padding: { x: 20, y: 10 },
        wordWrap: { width: width * 0.8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)

    this.scene.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 2000,
      duration: 500,
      onComplete: () => banner.destroy(),
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
        const myId = this.socketHandler.id
        if (myId && !this.gridEngine.isMoving(myId)) {
          this.gridEngine.move(myId, btnConfig.dir)
        }
      })

      btn.on('pointerup', () => btn.setFillStyle(0xffffff, 0.2))
      btn.on('pointerout', () => btn.setFillStyle(0xffffff, 0.2))
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
}
