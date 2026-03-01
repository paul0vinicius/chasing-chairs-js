import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { MainScene } from './MainScene'
import { GridEngine } from 'grid-engine'
import { useWindowSize } from '../hooks/useWindowSize.hook'
import { MenuScene } from './MenuScene'

export const GameComponent = () => {
  const { width, height } = useWindowSize()
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameInstance = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (gameContainerRef.current && !gameInstance.current) {
      gameInstance.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: gameContainerRef.current,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: width,
          height: height,
        },
        width: 800,
        height: 600,
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

    if (gameInstance.current) {
      gameInstance.current.scale.resize(width, height)

      // THE FIX: Calculate zoom based on screen size
      // If the screen is wider than 1000px, zoom out to 1.5x or 2x
      // If it's a small mobile, stay at 1x
      const scene = gameInstance.current.scene.getScene('MainScene') as MainScene
      if (scene && scene.cameras.main) {
        const zoom = width > 1000 ? 2 : 1
        scene.cameras.main.setZoom(zoom)
      }
    }
  }, [width, height])

  return (
    <div
      ref={gameContainerRef}
      id="game-container"
      style={{
        width: '100vw',
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
