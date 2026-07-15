import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface TagProps {
  children: ReactNode
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  removable?: boolean
  onRemove?: () => void
  icon?: ReactNode
}

const variantClasses: Record<string, string> = {
  brand:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  success:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger:
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  neutral:
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

export function Tag({
  children,
  variant = 'neutral',
  size = 'md',
  removable = false,
  onRemove,
  icon,
}: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium',
        variantClasses[variant],
        sizeClasses[size],
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          className={cn(
            'ml-0.5 -mr-1 flex-shrink-0 rounded p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10',
            size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
          )}
          aria-label="Remove"
        >
          <svg
            className="h-full w-full"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  )
}
