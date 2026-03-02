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

  public buildMaze(mapData: number[][]) {
    const { width, height } = this._scene.scale

    const startX = width / 4
    const startY = height / 4

    this._worldContainer = this._scene.add.container(startX, startY)
    this._worldContainer.setDepth(10)

    const map = this._scene.make.tilemap({ data: mapData, tileWidth: 32, tileHeight: 32 })
    const tileset = map.addTilesetImage('tileTexture', 'tileTexture')

    if (tileset) {
      // A camada continua no 0,0 local do container
      const layer = map.createLayer(0, tileset, startX, startY)

      layer!.layer.data.forEach((row) => {
        row.forEach((tile) => {
          if (tile.index === 1) {
            tile.properties.ge_collide = true
          }
        })
      })

      this._worldContainer.add(layer!)
    }

    this._gridEngine.create(map, { characters: [] })
  }
}
