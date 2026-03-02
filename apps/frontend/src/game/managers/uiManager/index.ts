import { Scene } from 'phaser'
import { Direction, GridEngine } from 'grid-engine'
import { SocketHandler } from '../socketHandler'

export class UIManager {
  private scene: Scene
  private socketHandler: SocketHandler
  private gridEngine: GridEngine
  private currentMusic: HTMLAudioElement | null = null

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

    if (isDesktop) {
      return
    }

    const { width, height } = this.scene.scale
    const size = Math.min(width, height) * 0.13
    const padding = 60
    const centerX = width - size * 2 - padding
    const centerY = height - size * 6 - padding

    const buttons = [
      { dir: Direction.UP, x: centerX + size, y: centerY },
      { dir: Direction.DOWN, x: centerX + size, y: centerY + size * 2 },
      { dir: Direction.LEFT, x: centerX, y: centerY + size },
      { dir: Direction.RIGHT, x: centerX + size * 2, y: centerY + size },
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

  public handleMusic(url: string) {
    if (!this.currentMusic) this.currentMusic = new Audio()
    this.currentMusic.src = url
    this.currentMusic.load()
    this.currentMusic.play().catch(() => {
      this.showBanner('TAP TO UNMUTE MUSIC')
      this.scene.input.once('pointerdown', () => this.currentMusic?.play())
    })
  }

  public stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause()
      this.currentMusic = null
    }
  }
}
