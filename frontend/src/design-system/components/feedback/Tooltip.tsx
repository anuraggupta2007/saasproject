import React, { useState, useRef, useCallback } from 'react'
import { cn } from '@/utils/cn'
import { motion, AnimatePresence } from 'framer-motion'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  side?: 'top' | 'bottom' | 'left' | 'right'
  delayMs?: number
}

const sideStyles: Record<NonNullable<TooltipProps['side']>, {
  content: string
  arrow: string
}> = {
  top: {
    content: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-100 border-x-transparent border-b-transparent',
  },
  bottom: {
    content: 'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-100 border-x-transparent border-t-transparent',
  },
  left: {
    content: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-100 border-y-transparent border-r-transparent',
  },
  right: {
    content: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-100 border-y-transparent border-l-transparent',
  },
}

function Tooltip({ content, children, side = 'top', delayMs = 200 }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idRef = useRef(`tooltip-${Math.random().toString(36).slice(2, 9)}`)

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(true), delayMs)
  }, [delayMs])

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(false)
  }, [])

  const styles = sideStyles[side]

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <div
        aria-describedby={open ? idRef.current : undefined}
        tabIndex={0}
        className="outline-none"
      >
        {children}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id={idRef.current}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'pointer-events-none absolute z-50 whitespace-nowrap rounded-md px-3 py-1.5',
              'bg-gray-900 text-xs font-medium text-gray-50 shadow-md',
              'dark:bg-gray-100 dark:text-gray-900',
              styles.content
            )}
          >
            {content}
            <span
              className={cn(
                'absolute h-0 w-0 border-[4px]',
                styles.arrow
              )}
              aria-hidden="true"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

Tooltip.displayName = 'Tooltip'

export { Tooltip }
export type { TooltipProps }
