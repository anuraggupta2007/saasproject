import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { InputFormat, OutputFormat, VALID_FORMAT_COMBINATIONS } from '../../types';

interface FormatSelectorProps {
  label: string;
  formats: Array<{ format: string; icon?: React.ReactNode; description?: string; disabled?: boolean }>;
  selected: string[];
  onChange: (formats: string[]) => void;
  multiple?: boolean;
  className?: string;
}

export const FormatSelector = memo(
  forwardRef<HTMLDivElement, FormatSelectorProps>(
    ({ label, formats, selected, onChange, multiple = false, className }, ref) => {
      const handleToggle = (format: string, disabled?: boolean) => {
        if (disabled) return;

        if (multiple) {
          if (selected.includes(format)) {
            onChange(selected.filter((f) => f !== format));
          } else {
            onChange([...selected, format]);
          }
        } else {
          onChange([format]);
        }
      };

      return (
        <div ref={ref} className={cn('space-y-3', className)}>
          <label className="block text-sm font-medium text-slate-300">{label}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {formats.map((fmt) => {
              const isSelected = selected.includes(fmt.format);
              return (
                <motion.button
                  key={fmt.format}
                  type="button"
                  onClick={() => handleToggle(fmt.format, fmt.disabled)}
                  disabled={fmt.disabled}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                    isSelected
                      ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/20'
                      : 'border-white/10 bg-white/5 hover:border-white/30',
                    fmt.disabled && 'opacity-40 cursor-not-allowed'
                  )}
                  whileHover={fmt.disabled ? {} : { y: -2 }}
                  whileTap={fmt.disabled ? {} : { scale: 0.98 }}
                >
                  {isSelected && (
                    <motion.div
                      className="absolute top-2 right-2 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold',
                    isSelected ? 'bg-brand-500/20 text-brand-400' : 'bg-white/10 text-slate-300'
                  )}>
                    {fmt.format.toUpperCase()}
                  </div>
                  <span className={cn(
                    'text-sm font-medium',
                    isSelected ? 'text-white' : 'text-slate-300'
                  )}>
                    .{fmt.format}
                  </span>
                  {fmt.description && (
                    <span className="text-xs text-slate-500">{fmt.description}</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      );
    }
  )
);

FormatSelector.displayName = 'FormatSelector';
