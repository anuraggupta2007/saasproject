import type React from 'react'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'

interface DropdownItem {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  href?: string
  danger?: boolean
  disabled?: boolean
  divider?: boolean
}

interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  width?: 'auto' | 'sm' | 'md' | 'lg'
  className?: string
}

const widthStyles = {
  auto: 'min-w-[10rem]',
  sm: 'w-40',
  md: 'w-56',
  lg: 'w-72',
} as const

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'left',
  width = 'auto',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLButtonElement | HTMLAnchorElement>>(new Map())

  const focusItem = useCallback((index: number) => {
    const item = itemRefs.current.get(index)
    if (item) {
      item.focus()
      setFocusedIndex(index)
    }
  }, [])

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
    setFocusedIndex(-1)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setFocusedIndex(-1)
  }, [])

  const handleItemClick = useCallback(
    (item: DropdownItem) => {
      if (item.disabled || item.divider) return
      item.onClick?.()
      handleClose()
    },
    [handleClose],
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, handleClose])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return

      const enabledItems = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.disabled && !item.divider)

      const currentEnabledIndex = enabledItems.findIndex(({ index }) => index === focusedIndex)

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (currentEnabledIndex < enabledItems.length - 1) {
            focusItem(enabledItems[currentEnabledIndex + 1].index)
          } else {
            focusItem(enabledItems[0].index)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (currentEnabledIndex > 0) {
            focusItem(enabledItems[currentEnabledIndex - 1].index)
          } else {
            focusItem(enabledItems[enabledItems.length - 1].index)
          }
          break
        case 'Home':
          e.preventDefault()
          if (enabledItems.length > 0) {
            focusItem(enabledItems[0].index)
          }
          break
        case 'End':
          e.preventDefault()
          if (enabledItems.length > 0) {
            focusItem(enabledItems[enabledItems.length - 1].index)
          }
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedIndex >= 0) {
            handleItemClick(items[focusedIndex])
          }
          break
      }
    },
    [isOpen, items, focusedIndex, focusItem, handleItemClick],
  )

  const hasDividers = items.some((item) => item.divider)

  const renderItems = () => {
    if (!hasDividers) {
      return items.map((item, index) => renderSingleItem(item, index))
    }

    let globalIndex = 0

    return items.map((item, index) => {
      if (item.divider) {
        return (
          <div
            key={`divider-${index}`}
            className="my-1 h-px bg-[var(--ds-border-default,rgba(255,255,255,0.1))]"
            role="separator"
          />
        )
      }

      const currentIndex = globalIndex
      globalIndex++
      return renderSingleItem(item, currentIndex)
    })
  }

  const renderSingleItem = (item: DropdownItem, globalIndex: number) => {
    const isItemFocused = focusedIndex === globalIndex

    const content = (
      <>
        {item.icon && (
          <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
        )}
        <span className="flex-1 truncate">{item.label}</span>
      </>
    )

    const baseClasses = cn(
      'flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md',
      'transition-colors duration-150',
      'focus-visible:outline-none',
      item.disabled
        ? 'opacity-50 cursor-not-allowed'
        : 'cursor-pointer',
      item.danger
        ? cn(
            'text-[var(--ds-text-error,#ef4444)]',
            !item.disabled && 'hover:bg-red-500/10 hover:text-red-400',
          )
        : cn(
            'text-[var(--ds-text-primary,#e5e7eb)]',
            !item.disabled && 'hover:bg-white/5 hover:text-[var(--ds-text-primary,#e5e7eb)]',
          ),
      isItemFocused && !item.disabled && 'bg-white/10',
    )

    if (item.href) {
      return (
        <a
          key={item.label}
          ref={(el) => {
            if (el) itemRefs.current.set(globalIndex, el)
          }}
          href={item.href}
          role="menuitem"
          tabIndex={-1}
          className={baseClasses}
          onClick={(e) => {
            if (item.disabled) {
              e.preventDefault()
              return
            }
            handleClose()
          }}
        >
          {content}
        </a>
      )
    }

    return (
      <button
        key={item.label}
        ref={(el) => {
          if (el) itemRefs.current.set(globalIndex, el)
        }}
        type="button"
        role="menuitem"
        tabIndex={-1}
        disabled={item.disabled}
        className={baseClasses}
        onClick={() => handleItemClick(item)}
      >
        {content}
      </button>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <div
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleToggle()
          }
        }}
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute z-50 mt-1',
              'rounded-lg border p-1',
              'bg-[var(--ds-bg-primary,#111827)]/95 backdrop-blur-md',
              'border-[var(--ds-border-default,rgba(255,255,255,0.1))]',
              'shadow-xl shadow-black/25',
              'focus-visible:outline-none',
              align === 'right' ? 'right-0' : 'left-0',
              widthStyles[width],
            )}
          >
            {renderItems()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { Dropdown, type DropdownProps, type DropdownItem }
