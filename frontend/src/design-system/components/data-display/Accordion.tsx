import { useState, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'

export interface AccordionItem {
  id: string
  title: string
  content: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export interface AccordionProps {
  items: AccordionItem[]
  multiple?: boolean
  defaultOpen?: string[]
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={cn(
        'h-5 w-5 text-zinc-500 transition-transform duration-200 dark:text-zinc-400',
        open && 'rotate-180',
      )}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m19.5 8.25-7.5 7.5-7.5-7.5"
      />
    </svg>
  )
}

export function Accordion({
  items,
  multiple = false,
  defaultOpen = [],
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(
    new Set(defaultOpen),
  )

  const toggleItem = useCallback(
    (id: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          if (!multiple) {
            next.clear()
          }
          next.add(id)
        }
        return next
      })
    },
    [multiple],
  )

  const handleKeyDown = (
    e: React.KeyboardEvent,
    index: number,
  ) => {
    const enabledItems = items.filter((item) => !item.disabled)
    const enabledIndex = enabledItems.findIndex(
      (item) => item.id === items[index].id,
    )

    let nextIndex: number | null = null

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        nextIndex = (enabledIndex + 1) % enabledItems.length
        break
      case 'ArrowUp':
        e.preventDefault()
        nextIndex =
          (enabledIndex - 1 + enabledItems.length) % enabledItems.length
        break
      case 'Home':
        e.preventDefault()
        nextIndex = 0
        break
      case 'End':
        e.preventDefault()
        nextIndex = enabledItems.length - 1
        break
    }

    if (nextIndex !== null) {
      const nextItem = enabledItems[nextIndex]
      const button = document.getElementById(`accordion-trigger-${nextItem.id}`)
      button?.focus()
    }
  }

  return (
    <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {items.map((item, index) => {
        const isOpen = openItems.has(item.id)

        return (
          <div key={item.id}>
            <h3>
              <button
                id={`accordion-trigger-${item.id}`}
                type="button"
                disabled={item.disabled}
                aria-expanded={isOpen}
                aria-controls={`accordion-content-${item.id}`}
                onClick={() => toggleItem(item.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={cn(
                  'flex w-full items-center justify-between px-6 py-4 text-left text-sm font-medium transition-colors',
                  'hover:bg-zinc-50 dark:hover:bg-zinc-900/50',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
                  item.disabled &&
                    'cursor-not-allowed opacity-50 hover:bg-transparent dark:hover:bg-transparent',
                )}
              >
                <span className="flex items-center gap-3">
                  {item.icon && (
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {item.icon}
                    </span>
                  )}
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {item.title}
                  </span>
                </span>
                <ChevronIcon open={isOpen} />
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`accordion-content-${item.id}`}
                  role="region"
                  aria-labelledby={`accordion-trigger-${item.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-zinc-200 px-6 py-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
