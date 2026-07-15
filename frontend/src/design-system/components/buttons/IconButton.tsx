import type React from 'react'
import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ButtonProps } from './Button'

const variantStyles = {
  primary: [
    'gradient-brand text-white',
    'shadow-lg shadow-brand-500/25',
    'hover:shadow-xl hover:shadow-brand-500/30',
    'disabled:shadow-none',
  ].join(' '),
  secondary: [
    'bg-brand-100/10 text-brand-400',
    'border border-brand-500/25',
    'hover:bg-brand-100/20 hover:border-brand-500/50 hover:text-brand-300',
  ].join(' '),
  outline: [
    'bg-transparent text-slate-400',
    'border border-white/10',
    'hover:bg-white/5 hover:border-white/20 hover:text-slate-200',
  ].join(' '),
  ghost: [
    'bg-transparent text-slate-400',
    'border border-transparent',
    'hover:bg-white/5 hover:text-slate-200',
  ].join(' '),
  link: [
    'bg-transparent text-brand-400 border-none',
    'hover:text-brand-300',
  ].join(' '),
  danger: [
    'bg-gradient-to-br from-red-500 to-red-600 text-white',
    'shadow-lg shadow-red-500/25',
    'hover:shadow-xl hover:shadow-red-500/30',
    'disabled:shadow-none',
  ].join(' '),
} as const

const sizeStyles = {
  xs: 'h-7 w-7 rounded-md',
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-10 w-10 rounded-lg',
  lg: 'h-12 w-12 rounded-lg',
  xl: 'h-14 w-14 rounded-xl',
} as const

interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode
  label: string
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'ghost',
      size = 'md',
      loading = false,
      icon,
      label,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading

    return (
      <motion.button
        ref={ref}
        whileTap={isDisabled ? undefined : { scale: 0.97 }}
        whileHover={isDisabled ? undefined : { y: -1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex items-center justify-center font-semibold',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
          'disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...(props as any)}
      >
        {loading ? (
          <Loader2 className="shrink-0 animate-spin" size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />
        ) : (
          <span className="shrink-0 [&>svg]:w-[1.125em] [&>svg]:h-[1.125em]">{icon}</span>
        )}
      </motion.button>
    )
  },
)

IconButton.displayName = 'IconButton'

export { IconButton, type IconButtonProps }
