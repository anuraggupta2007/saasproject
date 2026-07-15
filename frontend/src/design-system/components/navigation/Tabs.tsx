import type React from 'react'
import { useRef, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  count?: number
  disabled?: boolean
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  variant?: 'underline' | 'pills' | 'enclosed'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
}

const sizeStyles = {
  sm: 'text-xs px-2.5 py-1.5 gap-1',
  md: 'text-sm px-3 py-2 gap-1.5',
  lg: 'text-base px-4 py-2.5 gap-2',
} as const

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  size = 'md',
  fullWidth = false,
  className,
}) => {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null)

  useEffect(() => {
    const activeRef = tabRefs.current.get(activeTab)
    if (activeRef && variant === 'underline') {
      const container = containerRef.current
      if (container) {
        const containerRect = container.getBoundingClientRect()
        const tabRect = activeRef.getBoundingClientRect()
        setIndicatorStyle({
          left: tabRect.left - containerRect.left,
          width: tabRect.width,
        })
      }
    }
  }, [activeTab, variant])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const enabledTabs = tabs.filter((t) => !t.disabled)
      const currentEnabledIndex = enabledTabs.findIndex((t) => t.id === activeTab)

      let nextIndex: number | null = null

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          nextIndex = (currentEnabledIndex + 1) % enabledTabs.length
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          nextIndex = (currentEnabledIndex - 1 + enabledTabs.length) % enabledTabs.length
          break
        case 'Home':
          e.preventDefault()
          nextIndex = 0
          break
        case 'End':
          e.preventDefault()
          nextIndex = enabledTabs.length - 1
          break
      }

      if (nextIndex !== null) {
        const nextTab = enabledTabs[nextIndex]
        onChange(nextTab.id)
        tabRefs.current.get(nextTab.id)?.focus()
      }
    },
    [tabs, activeTab, onChange],
  )

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-center',
        variant === 'underline' && [
          'relative border-b',
          'border-[var(--ds-border-default,rgba(255,255,255,0.1))]',
        ],
        variant === 'pills' && [
          'p-1 rounded-lg gap-1',
          'bg-[var(--ds-bg-secondary,#1f2937)]',
        ],
        variant === 'enclosed' && [
          'p-1 rounded-lg gap-1',
          'bg-[var(--ds-bg-secondary,#1f2937)]',
        ],
        fullWidth && 'w-full',
        className,
      )}
    >
      {variant === 'underline' && indicatorStyle && (
        <motion.div
          className="absolute bottom-0 h-0.5 rounded-full bg-[var(--ds-brand-primary,#08619d)]"
          initial={false}
          animate={{ left: indicatorStyle.left, width: indicatorStyle.width }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}

      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        const isDisabled = tab.disabled

        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el)
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(tab.id)}
            className={cn(
              'inline-flex items-center font-medium transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-brand-primary,#08619d)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-bg-primary,#111827)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              sizeStyles[size],
              fullWidth && 'flex-1 justify-center',
              variant === 'underline' && [
                'border-b-2 -mb-px',
                isActive
                  ? 'border-[var(--ds-brand-primary,#08619d)] text-[var(--ds-text-primary,#e5e7eb)]'
                  : 'border-transparent text-[var(--ds-text-tertiary,#9ca3af)] hover:text-[var(--ds-text-secondary,#d1d5db)]',
              ],
              variant === 'pills' && [
                'rounded-full',
                isActive
                  ? 'bg-[var(--ds-bg-primary,#111827)] text-[var(--ds-text-primary,#e5e7eb)] shadow-sm'
                  : 'text-[var(--ds-text-tertiary,#9ca3af)] hover:text-[var(--ds-text-secondary,#d1d5db)] hover:bg-white/5',
              ],
              variant === 'enclosed' && [
                'rounded-md',
                isActive
                  ? 'bg-[var(--ds-bg-primary,#111827)] text-[var(--ds-text-primary,#e5e7eb)] shadow-sm'
                  : 'text-[var(--ds-text-tertiary,#9ca3af)] hover:text-[var(--ds-text-secondary,#d1d5db)] hover:bg-white/5',
              ],
            )}
          >
            {tab.icon && <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'ml-1 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                  isActive
                    ? 'bg-[var(--ds-brand-primary,#08619d)] text-white'
                    : 'bg-white/10 text-[var(--ds-text-tertiary,#9ca3af)]',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

Tabs.displayName = 'Tabs'

export { Tabs, type TabsProps, type Tab }
