import { useId } from 'react'
import { cn } from '@/utils/cn'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeConfig = {
  sm: { track: 'h-5 w-9', thumb: 'size-3.5', translate: 'translate-x-[18px]' },
  md: { track: 'h-6 w-11', thumb: 'size-4', translate: 'translate-x-[22px]' },
  lg: { track: 'h-7 w-14', thumb: 'size-5', translate: 'translate-x-[30px]' },
}

function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
}: SwitchProps) {
  const id = useId()
  const config = sizeConfig[size]

  return (
    <div className="flex items-start gap-3">
      <button
        role="switch"
        type="button"
        aria-checked={checked}
        aria-label={label}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full transition-all duration-200',
          'border-2 border-transparent',
          config.track,
          checked
            ? 'bg-[var(--ds-brand-primary,#6366f1)]'
            : 'bg-[var(--ds-bg-muted,#374151)]',
          disabled && 'opacity-50 cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--ds-bg-primary,#111827)]',
          'focus-visible:ring-[var(--ds-brand-primary,#6366f1)]'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-sm transition-transform duration-200',
            'translate-x-0.5',
            config.thumb,
            checked && config.translate
          )}
        />
      </button>

      <div className="flex flex-col gap-0.5">
        {label && (
          <label
            htmlFor={id}
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
            id={`${id}-desc`}
            className="text-xs text-[var(--ds-text-tertiary,#9ca3af)]"
          >
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

export default Switch
