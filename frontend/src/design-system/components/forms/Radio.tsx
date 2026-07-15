import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  description?: string
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, id, disabled, ...props }, ref) => {
    const radioId = id || (label ? `radio-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="radio"
            id={radioId}
            disabled={disabled}
            className={cn(
              'peer sr-only',
              disabled && 'cursor-not-allowed',
              className
            )}
            aria-describedby={description ? `${radioId}-desc` : undefined}
            {...props}
          />

          <label
            htmlFor={radioId}
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
              'bg-white/5',
              'border-[var(--ds-border-default,rgba(255,255,255,0.1))]',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-[var(--ds-bg-primary,#111827)] peer-focus-visible:ring-[var(--ds-brand-primary,#6366f1)]',
              'peer-checked:border-[var(--ds-brand-primary,#6366f1)]',
              'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
              !disabled && 'cursor-pointer'
            )}
          >
            <span
              className={cn(
                'size-2.5 rounded-full bg-white transition-all duration-200',
                'scale-0',
                'peer-checked:scale-100'
              )}
            />
          </label>
        </div>

        <div className="flex flex-col gap-0.5">
          {label && (
            <label
              htmlFor={radioId}
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
              id={`${radioId}-desc`}
              className="text-xs text-[var(--ds-text-tertiary,#9ca3af)]"
            >
              {description}
            </p>
          )}
        </div>
      </div>
    )
  }
)

Radio.displayName = 'Radio'

export default Radio
