import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { MainScene } from './MainScene'
import { GridEngine } from 'grid-engine'
import { MenuScene } from './MenuScene'

export const GameComponent = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameInstance = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (gameContainerRef.current && !gameInstance.current) {
      gameInstance.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: gameContainerRef.current,
        ...({ resolution: 1 } as any),
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          expandParent: true,
          width: 390,
          height: 844,
        },
        pixelArt: true,
        antialias: false,
        dom: {
          createContainer: true,
        },
        scene: [MenuScene, MainScene],
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
      })
    }
  }, [])

  return (
    <div
      ref={gameContainerRef}
      id="game-container"
      style={{
        width: '100dvw',
        height: '100dvh',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
      }}
    />
  )
}

export default GameComponent
