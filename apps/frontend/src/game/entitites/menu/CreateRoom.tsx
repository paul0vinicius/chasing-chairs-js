import { FC, useState } from 'react'

interface CreateRoomProps {
  onGoBack: () => void
  onCreateRoom: (playerName: string, roomSize: number, rounds: number) => void
}

export const CreateRoom: FC<CreateRoomProps> = ({ onGoBack, onCreateRoom }) => {
  const [playerName, setPlayerName] = useState('')
  const [roomSize, setRoomSize] = useState(1)
  const [rounds, setRounds] = useState(1)

  return (
    // Container principal: Centralizado na tela toda, com um pouco de padding lateral para mobile
    <div className="flex flex-col items-center justify-center w-full h-full px-4 relative">
      {/* 1. Botão Voltar: Agora é um botão real, ancorado no topo esquerdo, com hover e feedback visual */}
      <button
        onClick={onGoBack}
        className="absolute top-6 left-6 md:top-10 md:left-10 font-pixel text-xl md:text-2xl text-white bg-black/50 border-2 border-white px-4 py-2 hover:bg-white hover:text-black active:scale-95 transition-all"
      >
        &lt; VOLTAR
      </button>

      {/* Container do Formulário */}
      <div className="flex flex-col items-center w-full max-w-md gap-8 mt-12 md:mt-0">
        {/* 2. Input de Nome: Padronizado, text-center, focus state customizado */}
        <input
          type="text"
          placeholder="Your Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full font-pixel text-2xl md:text-3xl p-4 text-center border-4 border-white bg-[#1a1a1a] text-white outline-none focus:border-[#ffcc00] transition-colors shadow-[6px_6px_0px_rgba(0,0,0,0.8)]"
        />

        {/* 3. Área de Seletores */}
        <div className="flex flex-col w-full gap-6 font-pixel text-2xl md:text-3xl text-[#ffcc00] font-bold">
          {/* Seletor: PLAYERS */}
          <div className="flex justify-between items-center bg-black/70 p-4 border-2 border-[#ffcc00] shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
            <span>PLAYERS:</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setRoomSize(Math.max(1, roomSize - 1))}
                className="w-10 h-10 md:w-12 md:h-12 bg-white text-black hover:bg-gray-300 active:scale-90 flex items-center justify-center border-2 border-transparent transition-transform"
              >
                &lt;
              </button>
              <span className="w-8 text-center">{roomSize}</span>
              <button
                onClick={() => setRoomSize(roomSize + 1)}
                className="w-10 h-10 md:w-12 md:h-12 bg-white text-black hover:bg-gray-300 active:scale-90 flex items-center justify-center border-2 border-transparent transition-transform"
              >
                &gt;
              </button>
            </div>
          </div>

          {/* Seletor: ROUNDS */}
          <div className="flex justify-between items-center bg-black/70 p-4 border-2 border-[#ffcc00] shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
            <span>ROUNDS:</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setRounds(Math.max(1, rounds - 1))}
                className="w-10 h-10 md:w-12 md:h-12 bg-white text-black hover:bg-gray-300 active:scale-90 flex items-center justify-center border-2 border-transparent transition-transform"
              >
                &lt;
              </button>
              <span className="w-8 text-center">{rounds}</span>
              <button
                onClick={() => setRounds(rounds + 1)}
                className="w-10 h-10 md:w-12 md:h-12 bg-white text-black hover:bg-gray-300 active:scale-90 flex items-center justify-center border-2 border-transparent transition-transform"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* 4. Botão de Criar Sala: Com cores hardcoded caso o seu config ainda não esteja mapeando */}
        <button
          onClick={() => onCreateRoom(playerName, roomSize, rounds)}
          className="w-full mt-4 font-pixel text-3xl md:text-4xl text-[#00ff00] bg-black/80 border-4 border-[#00ff00] p-4 hover:bg-[#00ff00] hover:text-black active:scale-95 transition-all shadow-[6px_6px_0px_rgba(0,0,0,1)] uppercase tracking-wide"
        >
          [ Create Room ]
        </button>
      </div>
    </div>
  )
}
