import { FC } from 'react'

interface RetroSelectorProps {
  label: string
  value: number
  onIncrement: () => void
  onDecrement: () => void
}

export const RetroSelector: FC<RetroSelectorProps> = ({
  label,
  value,
  onIncrement,
  onDecrement,
}) => {
  return (
    <div className="flex justify-between items-center bg-black/70 p-4 border-2 border-white shadow-[4px_4px_0px_rgba(0,0,0,0.8)] w-full">
      <span className="font-pixel text-2xl md:text-3xl text-white uppercase">{label}:</span>

      <div className="flex items-center gap-4">
        {/* Botão Menos */}
        <button
          onClick={onDecrement}
          className="w-10 h-10 md:w-12 md:h-12 bg-white text-black font-pixel text-2xl hover:bg-gray-300 active:scale-90 flex items-center justify-center transition-transform"
        >
          &lt;
        </button>

        {/* Valor Central */}
        <span className="font-pixel text-2xl md:text-3xl text-white w-8 text-center">{value}</span>

        {/* Botão Mais */}
        <button
          onClick={onIncrement}
          className="w-10 h-10 md:w-12 md:h-12 bg-white text-black font-pixel text-2xl hover:bg-gray-300 active:scale-90 flex items-center justify-center transition-transform"
        >
          &gt;
        </button>
      </div>
    </div>
  )
}
