import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

export const Switch = memo(
  forwardRef<HTMLButtonElement, SwitchProps>(
    ({ checked, onChange, disabled = false, size = 'md', label, className }, ref) => {
      const sizeStyles = {
        sm: { track: 'w-8 h-4.5', thumb: 'w-3.5 h-3.5', translate: 14 },
        md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 20 },
      };

      const s = sizeStyles[size];

      return (
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={cn(
            'relative inline-flex items-center rounded-full transition-colors duration-200 flex-shrink-0',
            s.track,
            checked ? 'bg-brand-500' : 'bg-white/10',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            className
          )}
        >
          <motion.span
            className={cn('inline-block rounded-full bg-white shadow-sm', s.thumb)}
            initial={false}
            animate={{ x: checked ? s.translate : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      );
    }
  )
);

Switch.displayName = 'Switch';
