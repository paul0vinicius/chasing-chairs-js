import GridEngine from 'grid-engine'
import { Scene } from 'phaser'

export class AnimationManager {
  private _scene: Scene
  private _gridEngine: GridEngine

  constructor(scene: Scene, gridEngine: GridEngine) {
    this._scene = scene
    this._gridEngine = gridEngine
  }

  createPlayersAnimation() {
    // Animação de Sentar (Supondo que seja a Linha 5 do seu sheet - frames 12, 13, 14)
    this._scene.anims.create({
      key: 'karen-sits',
      frames: this._scene.anims.generateFrameNumbers('karen', { start: 12, end: 14 }),
      frameRate: 5,
      repeat: 0, // Toca uma vez e para
    })

    this._scene.anims.create({
      key: 'karen-dances',
      frames: this._scene.anims.generateFrameNumbers('karen', { start: 18, end: 20 }),
      frameRate: 8,
      repeat: -1, // Loop infinito de comemoração
    })

    // Animação de Vitória (Supondo Linha 6 - frames 15, 16, 17)
    this._scene.anims.create({
      key: 'karen-wins',
      frames: this._scene.anims.generateFrameNumbers('karen', { start: 15, end: 17 }),
      frameRate: 8,
      repeat: -1, // Loop infinito de comemoração
    })
  }
}
