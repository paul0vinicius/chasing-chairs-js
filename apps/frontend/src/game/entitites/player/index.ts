import { Scene } from 'phaser'
import { GridEngine } from 'grid-engine'
import { MazeManager } from 'src/game/managers'

export class Player {
  public id: string
  private sprite: Phaser.GameObjects.Sprite
  private gridEngine: GridEngine

  constructor(
    scene: Scene,
    gridEngine: GridEngine,
    id: string,
    startPos: { x: number; y: number },
    texture: string,
    mazeManager: MazeManager
  ) {
    this.id = id
    this.gridEngine = gridEngine

    // Nasce no 0,0 local
    this.sprite = scene.add.sprite(0, 0, texture).setOrigin(0)

    // O Container gerencia a posição real e o tamanho na tela
    mazeManager.worldContainer.add(this.sprite)

    this.gridEngine.addCharacter({
      id: this.id,
      sprite: this.sprite,
      startPosition: startPos,
      speed: 5,
      collides: {
        collisionGroups: [this.id],
      },
    })
  }

  public setWinnerTint() {
    this.sprite.setTint(0xffff00)
  }

  public clearTint() {
    this.sprite.clearTint()
  }

  public destroy() {
    this.gridEngine.removeCharacter(this.id)
    this.sprite.destroy()
  }
}
