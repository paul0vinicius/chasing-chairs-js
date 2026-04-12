import { FC } from 'react'
import { RetroButton } from '../../../components'
import { RotateOverlay } from './RotateOverlay'
import { Player } from '@chasing-chairs/shared'

interface GameOverScreenProps {
  players: Record<string, Player>
  onReturnToMenu: () => void
}

export const GameOverScreen: FC<GameOverScreenProps> = ({ players, onReturnToMenu }) => {
  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score)
  const winner = sortedPlayers[0]

  return (
    <div className="flex flex-col items-center justify-center w-full h-full max-w-2xl mx-auto animate-fade-in relative px-safe-left pt-safe-top pb-safe-bottom py-4">
      <RotateOverlay />

      <div className="w-full max-w-md bg-black/80 border-4 border-white p-6 md:p-8 shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center">
        {/* Título Principal */}
        <h1 className="font-bayoc text-5xl md:text-6xl text-white mb-2 drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] uppercase -webkit-text-stroke-1">
          Fim de Jogo!
        </h1>

        <div className="w-full h-1 bg-white/20 mb-6"></div>

        {/* Destaque do Vencedor */}
        {winner && (
          <h2 className="font-pixel text-xl md:text-2xl text-yellow-400 animate-pulse mb-6 uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            👑 {winner.name} Venceu! 👑
          </h2>
        )}

        {/* Lista de Pontuações (Placar Final) */}
        <div className="flex flex-col w-full gap-3 mb-8 max-h-[30vh] overflow-y-auto pr-2">
          {sortedPlayers.map((player, index) => {
            const isWinner = index === 0
            return (
              <div
                key={player.id}
                className={`flex justify-between items-center p-3 border-2 shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
                  isWinner
                    ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                    : 'border-white/50 bg-white/5 text-white'
                }`}
              >
                <span className="font-pixel text-lg md:text-xl truncate max-w-[60%] text-left">
                  {index + 1}. {player.name}
                </span>
                <span className="font-pixel text-xl md:text-2xl">{player.score} pts</span>
              </div>
            )
          })}
        </div>

        {/* Botão de Ação */}
        <div className="w-full">
          <RetroButton onClick={onReturnToMenu} className="w-full !py-3">
            Voltar ao Menu
          </RetroButton>
        </div>
      </div>
    </div>
  )
}
