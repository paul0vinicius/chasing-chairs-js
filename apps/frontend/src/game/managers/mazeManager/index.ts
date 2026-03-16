import { Scene } from 'phaser'
import { GridEngine } from 'grid-engine'

export class MazeManager {
  private _scene: Scene
  private _gridEngine: GridEngine
  private _worldContainer!: Phaser.GameObjects.Container

  // Guardamos o offset para que os Players saibam onde nascer
  public offsetX: number = 0
  public offsetY: number = 0

  constructor(scene: Scene, gridEngine: GridEngine) {
    this._scene = scene
    this._gridEngine = gridEngine
  }

  public get worldContainer() {
    return this._worldContainer
  }

  public buildMaze(mapData: number[][], backgroundId: string) {
    const { width: screenWidth, height: screenHeight } = this._scene.scale
    const tileSide = 32

    const mapWidthPx = mapData[0].length * tileSide
    const mapHeightPx = mapData.length * tileSide

    // LÓGICA RESPONSIVA:
    // Se a tela for maior que o mapa, centraliza.
    // Se for menor (mobile), encosta no topo/esquerda (0,0).
    this.offsetX = Math.max(0, (screenWidth - mapWidthPx) / 2)
    this.offsetY = Math.max(0, (screenHeight - mapHeightPx) / 2)

    // Criamos o container na posição calculada
    this._worldContainer = this._scene.add.container(this.offsetX, this.offsetY)
    this._worldContainer.setDepth(1)

    // O Background fica na cena (fixo) cobrindo tudo
    this._scene.add
      .tileSprite(0, 0, screenWidth, screenHeight, backgroundId)
      .setOrigin(0, 0)
      .setDepth(0)

    const map = this._scene.make.tilemap({
      data: mapData,
      tileWidth: tileSide,
      tileHeight: tileSide,
    })
    const tileset = map.addTilesetImage('tileTexture', 'tileTexture')

    if (tileset) {
      // Camada de chão adicionada ao container no 0,0 dele
      const layer = map.createLayer(0, tileset, 0, 0)
      this._worldContainer.add(layer!)

      layer!.layer.data.forEach((row, y) => {
        row.forEach((tile, x) => {
          if (tile.index === 1) {
            // Parede adicionada ao container
            const wall = this._scene.add.image(x * tileSide + 16, y * tileSide + 16, 'wall')
            this._worldContainer.add(wall)
            tile.properties.ge_collide = true
          }
        })
      })
    }

    this._gridEngine.create(map, { characters: [] })
  }
}
