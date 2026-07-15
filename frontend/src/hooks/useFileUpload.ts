import { useCallback, useRef, useState } from 'react'

export function useFileUpload(onFiles?: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false)
  const dragCounter = useRef(0)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragging(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current = 0
      setDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0 && onFiles) {
        onFiles(files)
      }
    },
    [onFiles],
  )

  return { dragging, handleDragOver, handleDragEnter, handleDragLeave, handleDrop } as const
}
