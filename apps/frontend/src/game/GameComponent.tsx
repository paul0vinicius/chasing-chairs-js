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
      // O "despertador" tunado para o tempo do iOS
      const forcePhaserResize = () => {
        if (gameInstance.current && gameContainerRef.current) {
          // Captura o tamanho REAL da div depois que o iOS terminou de esticar
          const width = gameContainerRef.current.clientWidth
          const height = gameContainerRef.current.clientHeight

          // Força o motor do Phaser a redesenhar a projeção da câmera e o canvas
          gameInstance.current.scale.resize(width, height)
        }
      }

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          // 500ms é o "sweet spot" para o iOS terminar a animação de resume
          setTimeout(forcePhaserResize, 500)
        }
      }

      const handleWindowResize = () => {
        // Pequeno debounce natural para quando o usuário vira o celular ou abre o teclado
        setTimeout(forcePhaserResize, 100)
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('resize', handleWindowResize)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('resize', handleWindowResize)
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
