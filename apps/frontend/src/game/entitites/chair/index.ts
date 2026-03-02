import { Scene } from 'phaser'

export class Chair {
  private sprite: Phaser.GameObjects.Sprite
  public position: { x: number; y: number }

  constructor(scene: Scene, x: number, y: number, container: Phaser.GameObjects.Container) {
    this.position = { x, y }
    // Cria o sprite e já adiciona ao container do labirinto
    this.sprite = scene.add.sprite(x * 32, y * 32, 'chairTexture').setOrigin(0)
    container.add(this.sprite)
  }

  public destroy() {
    if (this.sprite) this.sprite.destroy()
    this.position = { x: -1, y: -1 }
  }
}
