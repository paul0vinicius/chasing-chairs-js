import { Scene } from 'phaser'
import { GridEngine } from 'grid-engine'

export class MazeManager {
  private _scene: Scene
  private _gridEngine: GridEngine
  private _worldContainer!: Phaser.GameObjects.Container

  public get worldContainer(): Phaser.GameObjects.Container {
    return this._worldContainer
  }

  constructor(scene: Scene, gridEngine: GridEngine) {
    this._scene = scene
    this._gridEngine = gridEngine
  }

  public buildMaze() {
    const mapData = [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ]

    const { width, height } = this._scene.scale
    const mazeWidth = 8 * 32

    // FIX: Adicionamos um Math.min para limitar o "zoom" no Desktop
    // Agora ele ocupa 80% da tela, mas NUNCA passa da escala 3x
    const targetScale = Math.min((width * 0.8) / mazeWidth, 3)

    // FIX: Calculamos o X inicial do container baseado na escala final
    const scaledMazeWidth = mazeWidth * targetScale
    const startX = (width - scaledMazeWidth) / 2

    // O Container agora é colocado exatamente no meio, sem precisar de offset interno!
    this._worldContainer = this._scene.add.container(startX, height * 0.3)
    this._worldContainer.setScale(targetScale)

    const map = this._scene.make.tilemap({ data: mapData, tileWidth: 32, tileHeight: 32 })
    const tileset = map.addTilesetImage('tileTexture', 'tileTexture')

    if (tileset) {
      // FIX: A camada agora começa no 0,0 exato do container
      // Isso garante que o GridEngine e o mapa estejam em perfeita sincronia!
      const layer = map.createLayer(0, tileset, 0, 0)
      this._worldContainer.add(layer!)
    }

    const playerSprite = this._scene.add.sprite(0, 0, 'playerTexture').setOrigin(0)
    this.addEntity(playerSprite)

    this._gridEngine.create(map, {
      characters: [],
    })
  }

  // Método para que a Scene possa adicionar cadeiras e inimigos ao mapa
  // sem precisar acessar o `_worldContainer` diretamente.
  public addEntity(sprite: Phaser.GameObjects.Sprite) {
    if (this._worldContainer) {
      this._worldContainer.add(sprite)
    }
  }
}
