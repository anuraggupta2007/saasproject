import React from 'react'
import { cn } from '@/utils/cn'

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showPercent?: boolean
  color?: 'brand' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  striped?: boolean
  animated?: boolean
  className?: string
}

const colorStyles: Record<NonNullable<ProgressBarProps['color']>, { bar: string; shimmer: string }> = {
  brand: {
    bar: 'bg-gradient-to-r from-indigo-500 to-indigo-400',
    shimmer: 'from-indigo-600 via-indigo-400 to-indigo-600',
  },
  success: {
    bar: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    shimmer: 'from-emerald-600 via-emerald-400 to-emerald-600',
  },
  warning: {
    bar: 'bg-gradient-to-r from-amber-500 to-amber-400',
    shimmer: 'from-amber-600 via-amber-400 to-amber-600',
  },
  danger: {
    bar: 'bg-gradient-to-r from-red-500 to-red-400',
    shimmer: 'from-red-600 via-red-400 to-red-600',
  },
}

const sizeStyles: Record<NonNullable<ProgressBarProps['size']>, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = false,
  color = 'brand',
  size = 'md',
  striped = false,
  animated = true,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(value, max))
  const percent = max > 0 ? Math.round((clamped / max) * 100) : 0
  const styles = colorStyles[color]

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercent) && (
        <div className="mb-1 flex items-center justify-between text-sm">
          {label && <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>}
          {showPercent && (
            <span className="text-gray-500 dark:text-gray-400">{percent}%</span>
          )}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? `Progress: ${percent}%`}
        className={cn(
          'overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
          sizeStyles[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300 ease-out',
            styles.bar,
            striped && 'bg-stripes',
            animated && striped && 'animate-stripe'
          )}
          style={{ width: `${percent}%` }}
        >
          {animated && (
            <div
              className={cn(
                'h-full w-full bg-gradient-to-r opacity-30',
                'animate-shimmer',
                styles.shimmer
              )}
            />
          )}
        </div>
      </div>
    </div>
  )
}

ProgressBar.displayName = 'ProgressBar'

export { ProgressBar }
export type { ProgressBarProps }
