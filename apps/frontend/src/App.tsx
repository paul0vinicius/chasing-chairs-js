import { useState } from 'react';
import GameComponent from './game/GameComponent'

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#000', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {!started ? (
        <button 
          onClick={() => setStarted(true)}
          style={{ padding: '20px 40px', fontSize: '24px', cursor: 'pointer', zIndex: 100 }}
        >
          START GAME
        </button>
      ) : (
        <GameComponent />
      )}
    </div>
  );
}