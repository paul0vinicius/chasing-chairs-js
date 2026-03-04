import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { MainScene } from './MainScene'
import { GridEngine } from 'grid-engine'
import { MenuScene } from './MenuScene'

export const GameComponent = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameInstance = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    // 1. Detecta o valor da Safe Area Inferior (geralmente 34px no iPhone moderno)
    // Criamos um elemento temporário para medir o env() com precisão
    const div = document.createElement('div')
    div.style.paddingBottom = 'env(safe-area-inset-bottom)'
    document.body.appendChild(div)
    const safeAreaBottom = parseInt(window.getComputedStyle(div).paddingBottom)
    document.body.removeChild(div)

    // 2. Salva esse valor como uma variável CSS fixa no :root
    // Mesmo que o iOS "esqueça" o env(), o --fixed-safe-area-bottom continuará lá
    document.documentElement.style.setProperty('--fixed-safe-area-bottom', `${safeAreaBottom}px`)

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
    }
  }, [])

  return <div ref={gameContainerRef} id="game-container" />
}

export default GameComponent
