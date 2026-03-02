import { Scene } from 'phaser'
import { GridEngine } from 'grid-engine'

export class Player {
  public id: string
  private sprite: Phaser.GameObjects.Sprite
  private gridEngine: GridEngine

  constructor(
    scene: Scene,
    gridEngine: GridEngine,
    id: string,
    startPos: { x: number; y: number },
    texture: string, // 'playerTexture' (verde) ou 'remoteTexture' (vermelho)
    container: Phaser.GameObjects.Container
  ) {
    this.id = id
    this.gridEngine = gridEngine

    // Cria o sprite e adiciona ao mundo
    this.sprite = scene.add.sprite(0, 0, texture).setOrigin(0)
    container.add(this.sprite)

    // Registra o personagem no motor de física
    this.gridEngine.addCharacter({
      id: this.id,
      sprite: this.sprite,
      startPosition: startPos,
    })
  }

  public setWinnerTint() {
    this.sprite.setTint(0xffff00) // Amarelo
  }

  public clearTint() {
    this.sprite.clearTint()
  }

  public destroy() {
    this.gridEngine.removeCharacter(this.id)
    this.sprite.destroy()
  }
}
