import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
}

const ChevronIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, id, disabled, ...props }, ref) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-[var(--ds-text-primary,#e5e7eb)]"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={cn(
              'w-full appearance-none rounded-lg border bg-white/5 backdrop-blur-sm',
              'text-[var(--ds-text-primary,#e5e7eb)]',
              'h-10 px-3.5 pr-10 text-sm',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[var(--ds-bg-primary,#111827)]',
              error
                ? 'border-[var(--ds-border-error,#ef4444)] focus:ring-[var(--ds-border-error,#ef4444)] focus:border-[var(--ds-border-error,#ef4444)]'
                : 'border-[var(--ds-border-default,rgba(255,255,255,0.1))] focus:ring-[var(--ds-brand-primary,#6366f1)] focus:border-[var(--ds-brand-primary,#6366f1)]',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>

          <span
            className={cn(
              'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2',
              'text-[var(--ds-text-tertiary,#9ca3af)]'
            )}
          >
            <ChevronIcon className="size-4" />
          </span>
        </div>

        {error && (
          <p id={`${selectId}-error`} className="text-xs text-[var(--ds-text-error,#ef4444)]">
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={`${selectId}-hint`} className="text-xs text-[var(--ds-text-tertiary,#9ca3af)]">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select
