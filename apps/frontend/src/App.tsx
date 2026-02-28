import { useState } from 'react'
import GameComponent from './game/GameComponent'

export default function App() {
  const [started, setStarted] = useState(false)

  const handleStart = () => {
    // 1. Create a dummy audio context to 'wake up' the hardware
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    const audioCtx = new AudioContext()

    // 2. Play a millisecond of silence
    const oscillator = audioCtx.createOscillator()
    oscillator.connect(audioCtx.destination)
    oscillator.start(0)
    oscillator.stop(0.1)

    // 3. Now it's safe to start the game
    setStarted(true)
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {!started ? (
        <button
          onClick={handleStart}
          style={{ padding: '20px 40px', fontSize: '24px', cursor: 'pointer', zIndex: 100 }}
        >
          START GAME
        </button>
      ) : (
        <GameComponent />
      )}
    </div>
  )
}
