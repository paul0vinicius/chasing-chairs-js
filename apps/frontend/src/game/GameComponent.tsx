import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { MainScene } from './MainScene'
import { GridEngine } from 'grid-engine'
import { BootScene } from './BootScene'

export const GameComponent = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameInstance = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (gameContainerRef.current && !gameInstance.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: gameContainerRef.current,
        scale: {
          mode: Phaser.Scale.RESIZE,
          width: '100%',
          height: '100%',
          expandParent: true,
        },
        pixelArt: true,
        dom: {
          createContainer: true,
        },
        render: {
          antialias: false,
          pixelArt: true,
          roundPixels: true,
        },
        scene: [BootScene, MainScene],
        backgroundColor: '#1a1a1a',
        plugins: {
          scene: [
            {
              key: 'gridEngine',
              plugin: GridEngine,
              mapping: 'gridEngine',
            },
          ],
        },
      }

      gameInstance.current = new Phaser.Game(config)
    }
  }, [])

  return <div ref={gameContainerRef} id="game-container" />
}

export default GameComponent
