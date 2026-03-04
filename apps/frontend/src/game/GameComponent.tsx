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
      // O "despertador" para o Bug do iOS
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && gameInstance.current) {
          // Força o Phaser a esticar o canvas novamente ao reabrir o app
          setTimeout(() => gameInstance.current?.scale.refresh(), 100)
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        if (gameInstance.current) {
          gameInstance.current.destroy(true)
          gameInstance.current = null
        }
      }
    }
  }, [])

  return <div ref={gameContainerRef} id="game-container" />
}

export default GameComponent
