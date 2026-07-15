import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface ProgressCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  change?: { value: number; label: string; positive?: boolean };
  loading?: boolean;
  className?: string;
}

export const ProgressCard = memo(
  forwardRef<HTMLDivElement, ProgressCardProps>(
    ({ label, value, icon, variant = 'default', change, loading = false, className }, ref) => {
      const variantStyles = {
        default: 'border-brand-500/20',
        success: 'border-emerald-500/20',
        warning: 'border-amber-500/20',
        error: 'border-red-500/20',
        info: 'border-blue-500/20',
      };

      const iconBg = {
        default: 'bg-brand-500/10 text-brand-400',
        success: 'bg-emerald-500/10 text-emerald-400',
        warning: 'bg-amber-500/10 text-amber-400',
        error: 'bg-red-500/10 text-red-400',
        info: 'bg-blue-500/10 text-blue-400',
      };

      if (loading) {
        return (
          <div ref={ref} className={cn('p-6 rounded-2xl border bg-white/5', variantStyles[variant], className)}>
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-white/5 rounded w-1/3" />
              <div className="h-8 bg-white/5 rounded w-1/2" />
              <div className="h-3 bg-white/5 rounded w-1/4" />
            </div>
          </div>
        );
      }

      return (
        <div ref={ref} className={cn('p-6 rounded-2xl border bg-white/5', variantStyles[variant], className)}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">{label}</p>
              <p className="text-2xl font-bold text-white mt-1">{value}</p>
              {change && (
                <div className="flex items-center gap-1 mt-2">
                  <span className={cn('text-sm font-medium', change.positive ? 'text-emerald-400' : 'text-red-400')}>
                    {change.positive ? '+' : ''}{change.value}%
                  </span>
                  <span className="text-sm text-slate-500">{change.label}</span>
                </div>
              )}
            </div>
            {icon && (
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBg[variant])}>
                {icon}
              </div>
            )}
          </div>
        </div>
      );
    }
  )
);

ProgressCard.displayName = 'ProgressCard';
