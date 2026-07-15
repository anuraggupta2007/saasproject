import { useId, useCallback } from 'react'
import { cn } from '@/utils/cn'

export interface SliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  showValue?: boolean
  disabled?: boolean
}

function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = false,
  disabled = false,
}: SliderProps) {
  const id = useId()

  const percentage = ((value - min) / (max - min)) * 100

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value))
    },
    [onChange]
  )

  return (
    <div className="flex flex-col gap-2">
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={id}
              className="text-sm font-medium text-[var(--ds-text-primary,#e5e7eb)]"
            >
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm font-medium text-[var(--ds-text-secondary,#9ca3af)]">
              {value}
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        <input
          type="range"
          id={id}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'h-2 w-full cursor-pointer appearance-none rounded-full',
            'bg-[var(--ds-bg-muted,#374151)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--ds-bg-primary,#111827)]',
            'focus-visible:ring-[var(--ds-brand-primary,#6366f1)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:size-4',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-[var(--ds-brand-primary,#6366f1)]',
            '[&::-webkit-slider-thumb]:shadow-md',
            '[&::-webkit-slider-thumb]:transition-transform',
            '[&::-webkit-slider-thumb]:duration-150',
            '[&::-webkit-slider-thumb]:hover:scale-110',
            '[&::-moz-range-thumb]:size-4',
            '[&::-moz-range-thumb]:rounded-full',
            '[&::-moz-range-thumb]:bg-[var(--ds-brand-primary,#6366f1)]',
            '[&::-moz-range-thumb]:border-0',
            '[&::-moz-range-thumb]:shadow-md',
            '[&::-moz-range-thumb]:transition-transform',
            '[&::-moz-range-thumb]:duration-150',
            '[&::-moz-range-thumb]:hover:scale-110'
          )}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={label}
          style={{
            background: `linear-gradient(to right, var(--ds-brand-primary, #6366f1) 0%, var(--ds-brand-primary, #6366f1) ${percentage}%, var(--ds-bg-muted, #374151) ${percentage}%, var(--ds-bg-muted, #374151) 100%)`,
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--ds-text-tertiary,#6b7280)]">{min}</span>
        <span className="text-xs text-[var(--ds-text-tertiary,#6b7280)]">{max}</span>
      </div>
    </div>
  )
}

export default Slider
