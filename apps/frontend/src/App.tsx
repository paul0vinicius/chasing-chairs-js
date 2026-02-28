import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MainScene } from './game/MainScene';
import { GridEngine } from 'grid-engine';

export const GameComponent = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // ONLY initialize if the game doesn't exist yet
    if (gameContainerRef.current && !gameInstance.current) {
      gameInstance.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: gameContainerRef.current,
        width: 800,
        height: 600,
        backgroundColor: '#1a1a1a',
        scene: [MainScene],
        plugins: {
          scene: [
            {
              key: 'gridEngine',
              plugin: GridEngine,
              mapping: 'gridEngine',
            },
          ],
        },
      });
    }

    // Cleanup: Destroy the game when the component unmounts
    return () => {
      if (gameInstance.current) {
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, []);

  return <div ref={gameContainerRef} id="game-container" />;
}

export default GameComponent;