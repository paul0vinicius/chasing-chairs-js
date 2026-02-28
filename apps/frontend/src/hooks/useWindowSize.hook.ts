import { useState, useEffect } from 'react'

function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    const handleResize = () => {
      setSize({
        // Use visualViewport if available, otherwise fallback to innerWidth
        width: window.visualViewport ? window.visualViewport.width : window.innerWidth,
        height: window.visualViewport ? window.visualViewport.height : window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return size
}

export { useWindowSize }
