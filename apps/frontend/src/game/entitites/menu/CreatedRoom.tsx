import { FC } from 'react'
import { RotateOverlay } from './RotateOverlay' // Garantindo o lock visual

interface CreatedRoomProps {
  roomCode: string
  roomSize: number
  currentplayers: number
}

export const CreatedRoom: FC<CreatedRoomProps> = ({ roomCode, roomSize, currentplayers }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full max-w-2xl mx-auto animate-fade-in px-safe-left pt-safe-top pb-safe-bottom py-4">
      <RotateOverlay />
      <div className="w-full max-w-md bg-black/70 border-4 border-white p-4 md:p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center">
        <div className="mb-4 md:mb-6">
          <span className="font-pixel text-sm md:text-lg text-white/70 uppercase tracking-widest block mb-1">
            Código da sala:
          </span>
          <h2 className="font-pixel text-4xl md:text-6xl text-white uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            {roomCode}
          </h2>
        </div>

        <div className="w-full h-0.5 bg-white/20 mb-4 md:mb-6"></div>

        <div className="flex flex-col gap-2 md:gap-4">
          <div className="font-pixel text-lg md:text-2xl text-white animate-pulse uppercase">
            Esperando jogadores...
          </div>

          <div className="font-pixel text-2xl md:text-4xl text-white border-2 border-white inline-block px-4 py-1 bg-white/10 mx-auto">
            {currentplayers} / {roomSize}
          </div>
        </div>
        <p className="font-pixel text-white/60 text-xs md:text-sm mt-4 uppercase">
          A partida começará automaticamente
        </p>
      </div>
    </div>
  )
}
