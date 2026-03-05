import { FC } from 'react'

interface CreatedRoomProps {
  roomCode: string
  roomSize: number
  currentplayers: number
}

export const CreatedRoom: FC<CreatedRoomProps> = ({ roomCode, roomSize, currentplayers }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg animate-fade-in">
      <div className="w-full bg-black/70 border-4 border-white p-8 md:p-12 shadow-[10px_10px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center">
        <div className="mb-8">
          <span className="font-pixel text-xl md:text-2xl text-white/70 uppercase tracking-widest block mb-2">
            Código da sala:
          </span>
          <h2 className="font-pixel text-5xl md:text-7xl text-white uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            {roomCode}
          </h2>
        </div>

        <div className="w-full h-1 bg-white/20 mb-8"></div>

        <div className="flex flex-col gap-4">
          <div className="font-pixel text-2xl md:text-3xl text-white animate-pulse uppercase">
            Esperando pelos outros jogadores...
          </div>

          <div className="font-pixel text-4xl md:text-5xl text-white border-2 border-white inline-block px-6 py-2 bg-white/10">
            {currentplayers} / {roomSize}
          </div>
        </div>
        <p className="font-pixel text-white/60 text-lg mt-6 uppercase">
          A partida começará automaticamente
        </p>
      </div>
    </div>
  )
}
