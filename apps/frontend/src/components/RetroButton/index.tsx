export const RetroButton = ({ children, onClick, variant = 'white', className = '' }: any) => (
  <button
    onClick={onClick}
    className={`font-pixel text-2xl md:text-3xl border-2 p-2 px-6 transition-all active:scale-95 uppercase
      ${variant === 'white' ? 'border-white text-white bg-black/50 hover:bg-white hover:text-black' : ''}
      shadow-[4px_4px_0px_rgba(0,0,0,1)] ${className}`}
  >
    {children}
  </button>
)
