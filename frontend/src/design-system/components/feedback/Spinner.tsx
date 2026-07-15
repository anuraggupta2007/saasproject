import React from 'react'
import { cn } from '@/utils/cn'

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'brand' | 'white' | 'currentColor'
  label?: string
}

const sizeStyles: Record<NonNullable<SpinnerProps['size']>, { svg: string; stroke: string }> = {
  xs: { svg: 'h-3 w-3', stroke: 'stroke-[3]' },
  sm: { svg: 'h-4 w-4', stroke: 'stroke-[2.5]' },
  md: { svg: 'h-6 w-6', stroke: 'stroke-[2]' },
  lg: { svg: 'h-8 w-8', stroke: 'stroke-[2]' },
  xl: { svg: 'h-12 w-12', stroke: 'stroke-[1.5]' },
}

const colorStyles: Record<NonNullable<SpinnerProps['color']>, string> = {
  brand: 'text-indigo-600 dark:text-indigo-400',
  white: 'text-white',
  currentColor: 'text-current',
}

function Spinner({ size = 'md', color = 'brand', label }: SpinnerProps) {
  const s = sizeStyles[size]

  return (
    <span role="status" className="inline-flex items-center justify-center">
      {label && <span className="sr-only">{label}</span>}
      <svg
        className={cn('animate-spin', s.svg, s.stroke, colorStyles[color])}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeOpacity={0.25}
        />
        <path
          d="M12 2a10 10 0 019.95 9"
          stroke="currentColor"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

Spinner.displayName = 'Spinner'

export { Spinner }
export type { SpinnerProps }
