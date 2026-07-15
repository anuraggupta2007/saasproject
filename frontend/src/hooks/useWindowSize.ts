import { useEffect, useState } from 'react'

export function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    let frameId: number | null = null

    const handleResize = () => {
      if (frameId !== null) cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight })
        frameId = null
      })
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (frameId !== null) cancelAnimationFrame(frameId)
    }
  }, [])

  return size
}
