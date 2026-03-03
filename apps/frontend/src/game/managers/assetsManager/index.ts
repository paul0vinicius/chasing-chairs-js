import GridEngine from 'grid-engine'
import { Scene } from 'phaser'

export class AssetsManager {
  private _scene: Scene
  private _gridEngine: GridEngine

  constructor(scene: Scene, gridEngine: GridEngine) {
    this._scene = scene
    this._gridEngine = gridEngine
  }

  loadPlayersAssets() {
    // Karen's assets
    this._scene.load.spritesheet('karen', 'assets/chars/karen/sprite_sheet_karen.png', {
      frameWidth: 32,
      frameHeight: 50,
    })
  }

  loadMazeAssets() {
    // Load game backgrounds
    this._scene.load.image('garden', 'assets/background/garden_bg.jpg')
    this._scene.load.image('grass', 'assets/background/grass_bg.png')
    this._scene.load.image('desert', 'assets/background/desert_bg.png')
    this._scene.load.image('golden_tiles', 'assets/background/golden_tiles_bg.png')
    this._scene.load.image('mud_terrain', 'assets/background/mud_terrain_bg.png')

    // Load UI backgrounds
    this._scene.load.image('menu', 'assets/ui/menu_bg.jpg')
    this._scene.load.image('game_over', 'assets/ui/game_over_bg.jpg')

    // Load items and maze
    this._scene.load.image('chair', 'assets/items/chair.png')
    this._scene.load.image('wall', 'assets/maze/wall.png')
  }

  loadMusicAndSoundsAssets() {
    this._scene.load.audio('alert', 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg')
  }

  loadObjectsAssets() {}

  loadAll() {
    this.loadPlayersAssets()
    this.loadMazeAssets()
    this.loadMusicAndSoundsAssets()
    this.loadObjectsAssets()
  }
}
