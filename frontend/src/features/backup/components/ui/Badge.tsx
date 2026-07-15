import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps, SVGMotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';

interface BadgeProps extends HTMLMotionProps<'span'> {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

export const Badge = memo(
  forwardRef<HTMLSpanElement, BadgeProps>(
    (
      { children, variant = 'default', size = 'md', dot = false, removable = false, onRemove, className, ...props },
      ref
    ) => {
      const baseStyles = 'inline-flex items-center gap-1.5 font-medium rounded-full transition-colors';
      const variantStyles = {
        default: 'bg-white/10 text-slate-300 border border-white/10',
        success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        error: 'bg-red-500/15 text-red-400 border border-red-500/30',
        info: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
        neutral: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
        brand: 'bg-brand-500/15 text-brand-400 border border-brand-500/30',
      };
      const sizeStyles = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
      };
      const dotStyles = {
        default: 'bg-slate-400',
        success: 'bg-emerald-400',
        warning: 'bg-amber-400',
        error: 'bg-red-400',
        info: 'bg-blue-400',
        neutral: 'bg-slate-400',
        brand: 'bg-brand-400',
      };

      return (
        <motion.span
          ref={ref}
          className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          {...props}
        >
          {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotStyles[variant])} />}
          {children}
          {removable && (
            <motion.button
              onClick={onRemove}
              className="ml-1 p-0.5 rounded-full hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Remove"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          )}
        </motion.span>
      )
    }
  )
);

Badge.displayName = 'Badge';

interface StatusBadgeProps extends HTMLMotionProps<'span'> {
  status: 'connected' | 'disconnected' | 'error' | 'expired' | 'syncing' | 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'queued' | 'retrying' | 'completed_with_errors' | 'uploading' | 'validating' | 'processing' | 'compressing' | 'converting';
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<StatusBadgeProps['status'], { variant: BadgeProps['variant']; label: string }> = {
  connected: { variant: 'success', label: 'Connected' },
  disconnected: { variant: 'neutral', label: 'Disconnected' },
  error: { variant: 'error', label: 'Error' },
  expired: { variant: 'warning', label: 'Expired' },
  syncing: { variant: 'info', label: 'Syncing' },
  pending: { variant: 'warning', label: 'Pending' },
  running: { variant: 'info', label: 'Running' },
  paused: { variant: 'warning', label: 'Paused' },
  completed: { variant: 'success', label: 'Completed' },
  failed: { variant: 'error', label: 'Failed' },
  cancelled: { variant: 'neutral', label: 'Cancelled' },
  queued: { variant: 'neutral', label: 'Queued' },
  retrying: { variant: 'warning', label: 'Retrying' },
  completed_with_errors: { variant: 'warning', label: 'Completed with errors' },
  uploading: { variant: 'info', label: 'Uploading' },
  validating: { variant: 'info', label: 'Validating' },
  processing: { variant: 'info', label: 'Processing' },
  compressing: { variant: 'info', label: 'Compressing' },
  converting: { variant: 'info', label: 'Converting' },
};

export const StatusBadge = memo(
  forwardRef<HTMLSpanElement, StatusBadgeProps>(
    ({ status, showDot = true, size = 'md', className, ...props }, ref) => {
      const config = statusConfig[status] ?? { variant: 'neutral' as const, label: status };
      return (
        <Badge
          ref={ref}
          variant={config.variant}
          size={size}
          dot={showDot}
          className={className}
          {...props}
        >
          {config.label}
        </Badge>
      )
    }
  )
);

StatusBadge.displayName = 'StatusBadge';

export interface ProgressProps extends HTMLMotionProps<'div'> {
  value: number;
  max?: number;
  showLabel?: boolean;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  striped?: boolean;
  animated?: boolean;
}

export const Progress = memo(
  forwardRef<HTMLDivElement, ProgressProps>(
    (
      {
        value,
        max = 100,
        showLabel = true,
        label,
        variant = 'default',
        size = 'md',
        striped = false,
        animated = false,
        className,
        ...props
      },
      ref
    ) => {
      const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
      const baseStyles = 'relative overflow-hidden rounded-full bg-white/10';
      const sizeStyles = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
      };
      const variantStyles = {
        default: 'bg-brand-500',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        error: 'bg-red-500',
        brand: 'bg-gradient-to-r from-brand-500 to-brand-600',
      };

      return (
        <motion.div
          ref={ref}
          className={cn(baseStyles, sizeStyles[size], className)}
          {...props}
        >
          <motion.div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              variantStyles[variant],
              striped && 'bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[size:1rem_1rem]',
              animated && 'animate-stripes'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            style={{ width: `${percentage}%` }}
          />
          {showLabel && (
            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white/80">
              {label ?? `${Math.round(percentage)}%`}
            </span>
          )}
        </motion.div>
      )
    }
  )
);

Progress.displayName = 'Progress';

export interface CircularProgressProps extends SVGMotionProps<SVGSVGElement> {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'brand';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export const CircularProgress = memo(
  forwardRef<SVGSVGElement, CircularProgressProps>(
    (
      {
        value,
        max = 100,
        size = 64,
        strokeWidth = 4,
        variant = 'default',
        showLabel = true,
        label,
        className,
        ...props
      },
      ref
    ) => {
      const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (percentage / 100) * circumference;
      const variantStyles = {
        default: 'text-brand-500',
        success: 'text-emerald-500',
        warning: 'text-amber-500',
        error: 'text-red-500',
        brand: 'text-brand-500',
      };

      return (
        <motion.svg
          ref={ref}
          width={size}
          height={size}
          className={cn('transform -rotate-90', className)}
          {...props}
        >
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
            className={cn('transition-all duration-500 ease-out', variantStyles[variant])}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
          />
          {showLabel && (
            <text
              x={size / 2}
              y={size / 2}
              dominantBaseline="middle"
              textAnchor="middle"
              className="fill-white text-[10px] font-medium"
            >
              {label ?? `${Math.round(percentage)}%`}
            </text>
          )}
        </motion.svg>
      )
    }
  )
);

CircularProgress.displayName = 'CircularProgress';