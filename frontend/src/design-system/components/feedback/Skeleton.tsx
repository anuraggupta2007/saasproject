import React from 'react'
import { cn } from '@/utils/cn'

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  className?: string
  count?: number
}

const variantStyles: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'h-4 w-full rounded',
  circular: 'h-10 w-10 rounded-full',
  rectangular: 'h-10 w-full rounded-none',
  rounded: 'h-10 w-full rounded-lg',
}

function Skeleton({ variant = 'text', width, height, className, count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i)

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          role="presentation"
          className={cn(
            'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200',
            'dark:from-gray-700 dark:via-gray-600 dark:dark:to-gray-700',
            variantStyles[variant],
            className,
            count > 1 && i < count - 1 && 'mb-2'
          )}
          style={{ width: width, height: height }}
          aria-hidden="true"
        />
      ))}
    </>
  )
}

Skeleton.displayName = 'Skeleton'

export { Skeleton }
export type { SkeletonProps }
