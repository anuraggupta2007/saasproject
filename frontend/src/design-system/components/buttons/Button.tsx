import type React from 'react'
import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

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
    'underline underline-offset-4',
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
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-lg',
  xl: 'h-14 px-8 text-base gap-3 rounded-xl',
} as const

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles
  size?: keyof typeof sizeStyles
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      disabled,
      children,
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
        className={cn(
          'inline-flex items-center justify-center font-semibold',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
          'disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        {...(props as any)}
      >
        {loading ? (
          <Loader2 className="shrink-0 animate-spin" size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />
        ) : (
          leftIcon && <span className="shrink-0 [&>svg]:w-full [&>svg]:h-full">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!loading && rightIcon && (
          <span className="shrink-0 [&>svg]:w-full [&>svg]:h-full">{rightIcon}</span>
        )}
      </motion.button>
    )
  },
)

Button.displayName = 'Button'

export { Button, type ButtonProps }
