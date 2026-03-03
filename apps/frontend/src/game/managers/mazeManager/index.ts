import { Scene } from 'phaser'
import { GridEngine } from 'grid-engine'

export class MazeManager {
  private _scene: Scene
  private _gridEngine: GridEngine
  private _worldContainer!: Phaser.GameObjects.Container

  constructor(scene: Scene, gridEngine: GridEngine) {
    this._scene = scene
    this._gridEngine = gridEngine
  }

  public get worldContainer() {
    return this._worldContainer
  }

  public buildMaze(mapData: number[][], backgroundId: string) {
    const { width, height } = this._scene.scale

    const startX = width / 4
    const startY = height / 4

    this._worldContainer = this._scene.add.container(startX, startY)
    this._worldContainer.setDepth(10)

    const map = this._scene.make.tilemap({ data: mapData, tileWidth: 32, tileHeight: 32 })
    const tileset = map.addTilesetImage('tileTexture', 'tileTexture')

    if (tileset) {
      // A camada continua no 0,0 local do container
      const layer = map.createLayer(0, tileset, startX * 32, startY * 32)
      // this._scene.add.image(startX, startY, backgroundId).setDepth(-1).setScale(2);
      this._scene.add.tileSprite(0, 0, width, height, backgroundId).setOrigin(0, 0).setDepth(-1)

      layer!.layer.data.forEach((row, y) => {
        row.forEach((tile, x) => {
          if (tile.index === 1) {
            this._scene.add
              .image(startX + (x * 32 + 16), startY + (y * 32 + 16), 'wall')
              .setDepth(0)
            tile.properties.ge_collide = true
          }
        })
      })

      this._worldContainer.add(layer!)
    }

    this._gridEngine.create(map, { characters: [] })
  }
}
