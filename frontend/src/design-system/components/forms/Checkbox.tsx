import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  description?: string
  error?: string
}

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, disabled, ...props }, ref) => {
    const checkboxId = id || (label ? `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            disabled={disabled}
            className={cn(
              'peer sr-only',
              disabled && 'cursor-not-allowed',
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              error ? `${checkboxId}-error` : description ? `${checkboxId}-desc` : undefined
            }
            {...props}
          />

          <label
            htmlFor={checkboxId}
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200',
              'bg-white/5',
              error
                ? 'border-[var(--ds-border-error,#ef4444)]'
                : 'border-[var(--ds-border-default,rgba(255,255,255,0.1))]',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-[var(--ds-bg-primary,#111827)]',
              error
                ? 'peer-focus-visible:ring-[var(--ds-border-error,#ef4444)]'
                : 'peer-focus-visible:ring-[var(--ds-brand-primary,#08619d)]',
              'peer-checked:border-[var(--ds-brand-primary,#08619d)] peer-checked:bg-[var(--ds-brand-primary,#08619d)]',
              'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
              !disabled && 'cursor-pointer'
            )}
          >
            <CheckIcon
              className={cn(
                'size-3 text-white opacity-0 transition-all duration-200',
                'peer-checked:opacity-100',
                'peer-checked:scale-100 peer-checked:rotate-0',
                'scale-75 -rotate-90'
              )}
            />
          </label>
        </div>

        <div className="flex flex-col gap-0.5">
          {label && (
            <label
              htmlFor={checkboxId}
              className={cn(
                'text-sm font-medium text-[var(--ds-text-primary,#e5e7eb)]',
                !disabled && 'cursor-pointer',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {label}
            </label>
          )}

          {description && (
            <p
              id={`${checkboxId}-desc`}
              className="text-xs text-[var(--ds-text-tertiary,#9ca3af)]"
            >
              {description}
            </p>
          )}

          {error && (
            <p id={`${checkboxId}-error`} className="text-xs text-[var(--ds-text-error,#ef4444)]">
              {error}
            </p>
          )}
        </div>
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export default Checkbox
