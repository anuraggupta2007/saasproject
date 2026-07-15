import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, disabled, ...props }, ref) => {
    const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-[var(--ds-text-primary,#e5e7eb)]"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          className={cn(
            'w-full min-h-[120px] resize-y rounded-lg border bg-white/5 backdrop-blur-sm',
            'text-[var(--ds-text-primary,#e5e7eb)] placeholder:text-[var(--ds-text-tertiary,#6b7280)]',
            'px-3.5 py-2.5 text-sm',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[var(--ds-bg-primary,#111827)]',
            error
              ? 'border-[var(--ds-border-error,#ef4444)] focus:ring-[var(--ds-border-error,#ef4444)] focus:border-[var(--ds-border-error,#ef4444)]'
              : 'border-[var(--ds-border-default,rgba(255,255,255,0.1))] focus:ring-[var(--ds-brand-primary,#08619d)] focus:border-[var(--ds-brand-primary,#08619d)]',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
          }
          {...props}
        />

        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-[var(--ds-text-error,#ef4444)]">
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={`${textareaId}-hint`} className="text-xs text-[var(--ds-text-tertiary,#9ca3af)]">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export default Textarea
