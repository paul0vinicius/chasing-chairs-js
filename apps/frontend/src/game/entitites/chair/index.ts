import { Scene } from 'phaser'
import { MazeManager } from 'src/game/managers'

export class Chair {
  private sprite: Phaser.GameObjects.Sprite
  public position: { x: number; y: number }

  constructor(scene: Scene, x: number, y: number, mazeManager: MazeManager) {
    this.position = { x, y }

    // Nasce baseada na grade de 32px local
    this.sprite = scene.add.sprite(x * 32, y * 32, 'chairTexture').setOrigin(0)

    // Entra na caixinha para ser redimensionada e movida junto
    mazeManager.worldContainer.add(this.sprite)
  }

  public destroy() {
    if (this.sprite) this.sprite.destroy()
    this.position = { x: -1, y: -1 }
  }
}
