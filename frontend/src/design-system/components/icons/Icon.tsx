import type React from 'react'
import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

const sizeMap = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const

interface IconProps {
  children: React.ReactNode
  size?: keyof typeof sizeMap
  className?: string
}

const Icon = forwardRef<HTMLSpanElement, IconProps>(
  ({ children, size = 'md', className, ...props }, ref) => {
    const px = sizeMap[size]

    return (
      <span
        ref={ref}
        className={cn('inline-flex shrink-0 items-center justify-center', className)}
        style={{ width: px, height: px }}
        {...props}
      >
        {children}
      </span>
    )
  },
)

Icon.displayName = 'Icon'

export { Icon, type IconProps }
