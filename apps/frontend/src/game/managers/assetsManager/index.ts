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

  loadMazeAssets() {}

  loadMusicAndSoundsAssets() {}

  loadObjectsAssets() {}
}
