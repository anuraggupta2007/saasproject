import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  inputSize?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-3.5 text-sm',
  lg: 'h-12 px-4 text-base',
}

const iconSizeClasses = {
  sm: 'size-4',
  md: 'size-4',
  lg: 'size-5',
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      inputSize = 'md',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--ds-text-primary,#e5e7eb)]"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span
              className={cn(
                'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2',
                'text-[var(--ds-text-tertiary,#9ca3af)]',
                iconSizeClasses[inputSize]
              )}
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'w-full rounded-lg border bg-white/5 backdrop-blur-sm',
              'text-[var(--ds-text-primary,#e5e7eb)] placeholder:text-[var(--ds-text-tertiary,#6b7280)]',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[var(--ds-bg-primary,#111827)]',
              error
                ? 'border-[var(--ds-border-error,#ef4444)] focus:ring-[var(--ds-border-error,#ef4444)] focus:border-[var(--ds-border-error,#ef4444)]'
                : 'border-[var(--ds-border-default,rgba(255,255,255,0.1))] focus:ring-[var(--ds-brand-primary,#6366f1)] focus:border-[var(--ds-brand-primary,#6366f1)]',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              disabled && 'opacity-50 cursor-not-allowed',
              sizeClasses[inputSize],
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          />

          {rightIcon && (
            <span
              className={cn(
                'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2',
                'text-[var(--ds-text-tertiary,#9ca3af)]',
                iconSizeClasses[inputSize]
              )}
            >
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[var(--ds-text-error,#ef4444)]">
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-[var(--ds-text-tertiary,#9ca3af)]">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
