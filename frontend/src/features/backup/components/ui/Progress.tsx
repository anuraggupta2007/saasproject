import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  striped?: boolean;
  className?: string;
}

export const Progress = memo(
  forwardRef<HTMLDivElement, ProgressProps>(
    (
      { value = 0, max = 100, size = 'md', variant = 'default', showLabel = false, label, animated = true, striped = false, className },
      ref
    ) => {
      const percentage = Math.max(0, Math.min(100, (value / max) * 100));

      const sizeStyles = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
      };

      const variantStyles = {
        default: 'bg-white/10',
        brand: 'bg-gradient-to-r from-brand-500 to-brand-600',
        success: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
        warning: 'bg-gradient-to-r from-amber-500 to-amber-600',
        error: 'bg-gradient-to-r from-red-500 to-red-600',
      };

      return (
        <motion.div ref={ref} className={cn('w-full rounded-full overflow-hidden', sizeStyles[size], className)}>
          <motion.div
            className={cn(
              'h-full rounded-full transition-all duration-300 ease-out',
              variantStyles[variant],
              striped && 'bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]',
              animated && 'animate-pulse'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            style={{ width: `${percentage}%` }}
          />
          {(showLabel || label) && (
            <div className="flex items-center justify-between mt-1.5 text-sm">
              <span className="text-slate-400">{label || 'Progress'}</span>
              <span className="font-mono font-medium text-white">{percentage.toFixed(0)}%</span>
            </div>
          )}
        </motion.div>
      )
    }
  )
);

Progress.displayName = 'Progress';

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'error';
  showValue?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const CircularProgress = memo(
  forwardRef<HTMLDivElement, CircularProgressProps>(
    ({ value = 0, max = 100, size = 64, strokeWidth = 4, variant = 'brand', showValue = true, children, className }, ref) => {
      const percentage = Math.max(0, Math.min(100, (value / max) * 100));
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (percentage / 100) * circumference;

      const variantStyles = {
        default: 'stroke-white/20',
        brand: 'stroke-brand-500',
        success: 'stroke-emerald-500',
        warning: 'stroke-amber-500',
        error: 'stroke-red-500',
      };

      return (
        <motion.div
          ref={ref}
          className={cn('relative inline-flex items-center justify-center', className)}
          style={{ width: size, height: size }}
        >
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-white/10"
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={cn(variantStyles[variant], 'transition-all duration-500 ease-out')}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {showValue ? (
              <span className="font-mono font-semibold text-white">{percentage.toFixed(0)}%</span>
            ) : children ? (
              children
            ) : null}
          </div>
        </motion.div>
      )
    }
  )
);

CircularProgress.displayName = 'CircularProgress';

interface StepProgressProps {
  steps: Array<{ id: string; label: string; completed?: boolean; current?: boolean; error?: boolean }>;
  variant?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StepProgress = memo(
  forwardRef<HTMLDivElement, StepProgressProps>(
    ({ steps, variant = 'horizontal', size = 'md', className }, ref) => {
      const sizeStyles = {
        sm: { dot: 'w-5 h-5', line: 'w-1', font: 'text-xs', gap: 'gap-2' },
        md: { dot: 'w-8 h-8', line: 'w-1.5', font: 'text-sm', gap: 'gap-3' },
        lg: { dot: 'w-10 h-10', line: 'w-2', font: 'text-base', gap: 'gap-4' },
      };

      const s = sizeStyles[size];

      if (variant === 'vertical') {
        return (
          <motion.div ref={ref} className={cn('flex flex-col', s.gap, className)}>
            {steps.map((step, index) => (
              <motion.div key={step.id} className="flex items-start gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                <div className="flex flex-col items-center">
                  <motion.div
                    className={cn(
                      'rounded-full border-2 flex items-center justify-center transition-all duration-300',
                      s.dot,
                      step.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : step.current
                        ? 'bg-brand-500 border-brand-500 text-white ring-4 ring-brand-500/20'
                        : step.error
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'bg-white/5 border-white/20 text-white/50'
                    )}
                    whileHover={{ scale: 1.1 }}
                  >
                    {step.completed ? <Check className="w-4 h-4" /> : <span className="font-bold">{index + 1}</span>}
                  </motion.div>
                  {index < steps.length - 1 && (
                    <motion.div
                      className={cn(s.line, 'flex-1 max-h-16')}
                      style={{ height: step.completed ? '100%' : '0%' }}
                      initial={{ height: 0 }}
                      animate={{ height: step.completed ? '100%' : 0 }}
                      transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
                    >
                      <div className={cn('h-full rounded', step.completed ? 'bg-emerald-500' : 'bg-white/10')} />
                    </motion.div>
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <p className={cn(s.font, 'font-medium', step.current ? 'text-white' : 'text-slate-300')}>{step.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        );
      }

      return (
        <motion.div ref={ref} className={cn('flex items-center', s.gap, className)}>
          {steps.map((step, index) => (
            <motion.div key={step.id} className="flex items-center flex-1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
              {index > 0 && (
                <motion.div
                  className={cn('h-1 flex-1 rounded', s.line, 'max-w-[100px]')}
                  style={{ width: step.completed ? '100%' : '0%' }}
                  initial={{ width: 0 }}
                  animate={{ width: step.completed ? '100%' : 0 }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
                >
                  <div className={cn('h-full rounded', step.completed ? 'bg-emerald-500' : 'bg-white/10')} />
                </motion.div>
              )}
              <motion.div
                className={cn(
                  'rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0',
                  s.dot,
                  step.completed
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : step.current
                    ? 'bg-brand-500 border-brand-500 text-white ring-4 ring-brand-500/20'
                    : step.error
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'bg-white/5 border-white/20 text-white/50'
                )}
                whileHover={{ scale: 1.1 }}
              >
                {step.completed ? <Check className="w-4 h-4" /> : <span className="font-bold">{index + 1}</span>}
              </motion.div>
              <p className={cn(s.font, 'font-medium ml-2', step.current ? 'text-white' : 'text-slate-300')}>{step.label}</p>
            </motion.div>
          ))}
        </motion.div>
      )
    }
  )
);

StepProgress.displayName = 'StepProgress';

import { Check } from 'lucide-react';