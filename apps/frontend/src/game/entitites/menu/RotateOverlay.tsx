import { FC, useEffect, useState } from 'react'

export const RotateOverlay: FC = () => {
  const [isPortrait, setIsPortrait] = useState(false)

  useEffect(() => {
    const checkOrientation = () => {
      // Verifica se a altura é maior que a largura (Portrait)
      setIsPortrait(window.innerHeight > window.innerWidth)
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    return () => window.removeEventListener('resize', checkOrientation)
  }, [])

  if (!isPortrait) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
      <div className="animate-bounce mb-4">
        {/* Ícone simples de rotação */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M23 12a11 11 0 0 1-22 0" />
          <path d="M17 12l6-6 6 6" />
        </svg>
      </div>
      <h2 className="text-2xl font-pixel mb-2">Gire o aparelho</h2>
      <p className="opacity-80">Chasing Chairs é melhor aproveitado em modo paisagem!</p>
    </div>
  )
}
