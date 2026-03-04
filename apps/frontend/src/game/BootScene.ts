import { Scene } from 'phaser'
import GridEngine from 'grid-engine'

import { EventBus } from './eventsBus'
import { AssetsManager } from './managers'
import { RoomData } from '@chasing-chairs/shared'

export class BootScene extends Scene {
  private gridEngine!: GridEngine
  private assetsManager!: AssetsManager

  constructor() {
    super('BootScene')
  }

  preload() {
    this.assetsManager = new AssetsManager(this, this.gridEngine)
    this.assetsManager.loadAll()
  }

  create() {
    EventBus.once('gameStarted', (roomData: RoomData) => {
      this.scene.start('MainScene', { room: roomData })
    })
  }
}
