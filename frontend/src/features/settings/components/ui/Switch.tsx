import { memo, forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export const Switch = memo(
  forwardRef<HTMLButtonElement, SwitchProps>(
    ({ checked, onChange, disabled = false, className, label }, ref) => (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
          checked ? 'bg-brand-500' : 'bg-white/20',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    )
  )
);

Switch.displayName = 'Switch';
