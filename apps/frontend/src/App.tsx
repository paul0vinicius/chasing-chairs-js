import { useState } from 'react';
import GameComponent from './game/GameComponent';

const App = () => {
  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = () => {
    setHasStarted(true);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#111', overflow: 'hidden' }}>
      {!hasStarted ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          color: 'white',
          fontFamily: 'sans-serif'
        }}>
          <h1 style={{ marginBottom: '20px' }}>🎶 Musical Chairs Online</h1>
          <button 
            onClick={handleStart}
            style={{
              padding: '15px 40px',
              fontSize: '20px',
              cursor: 'pointer',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold'
            }}
          >
            JOIN GAME
          </button>
          <p style={{ marginTop: '20px', opacity: 0.6 }}>Tap to enable audio</p>
        </div>
      ) : (
        <GameComponent />
      )}
    </div>
  );
};

export default App;