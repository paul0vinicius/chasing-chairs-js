import { Scene } from 'phaser'
import { GridEngine } from 'grid-engine'
import { MazeManager } from 'src/game/managers'

const WALKING_ANIMATION_MAPPING = {
  down: {
    leftFoot: 0,
    standing: 1,
    rightFoot: 2,
  },
  left: {
    leftFoot: 3,
    standing: 4,
    rightFoot: 5,
  },
  right: {
    leftFoot: 6,
    standing: 7,
    rightFoot: 8,
  },
  up: {
    leftFoot: 9,
    standing: 10,
    rightFoot: 11,
  },
}

const GUEST_COLORS = [
  0xff8888, // Vermelho claro
  0x88ff88, // Verde claro
  0x8888ff, // Azul claro
  0xffff88, // Amarelo claro
]

export class Player {
  public id: string
  private _sprite: Phaser.GameObjects.Sprite
  private gridEngine: GridEngine
  private _canMove: boolean

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
    this._canMove = true

    // Nasce no 0,0 local
    this._sprite = scene.add.sprite(0, 0, texture).setOrigin(0.5, 0.8).setDepth(1)

    // O Container gerencia a posição real e o tamanho na tela
    mazeManager.worldContainer.add(this._sprite)

    this.gridEngine.addCharacter({
      id: this.id,
      sprite: this._sprite,
      startPosition: startPos,
      speed: 5,
      collides: {
        collisionGroups: [this.id],
      },
      walkingAnimationMapping: WALKING_ANIMATION_MAPPING,
    })
  }

  public setWinnerTint() {
    this._sprite.setTint(0xffff00)
  }

  public clearTint() {
    this._sprite.clearTint()
  }

  public destroy() {
    this.gridEngine.removeCharacter(this.id)
    this._sprite.destroy()
  }

  public dance() {
    this._canMove = true
    this.gridEngine.setWalkingAnimationMapping(this.id, undefined)
    this._sprite.play('karen-dances')
  }

  public walk() {
    this._canMove = true
    this._sprite.stop()
    this.gridEngine.setWalkingAnimationMapping(this.id, WALKING_ANIMATION_MAPPING)
  }

  public sit() {
    this._canMove = false
    this.gridEngine.setWalkingAnimationMapping(this.id, undefined)
    this._sprite.play('karen-sits')
    this.gridEngine.stopMovement(this.id)
  }

  public setRandomColor(playerOrder: number) {
    const colorIndex = playerOrder % GUEST_COLORS.length
    const tintColor = GUEST_COLORS[colorIndex]

    this._sprite.setTint(tintColor)
  }

  public get sprite() {
    return this._sprite
  }

  public get canMove() {
    return this._canMove
  }
}
