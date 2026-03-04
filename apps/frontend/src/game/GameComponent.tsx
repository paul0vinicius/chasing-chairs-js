import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { MainScene } from './MainScene'
import { GridEngine } from 'grid-engine'
import { MenuScene } from './MenuScene'

export const GameComponent = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameInstance = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    // Garante que o jogo só seja criado UMA vez
    if (gameContainerRef.current && !gameInstance.current) {
      
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: gameContainerRef.current,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: '100%',
          height: '100%',
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
      }

      gameInstance.current = new Phaser.Game(config)
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
        backgroundColor: '#000',
      }}
    />
  )
}

export default GameComponent