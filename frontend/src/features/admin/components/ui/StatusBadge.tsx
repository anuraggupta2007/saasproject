import { memo } from 'react';
import { cn } from '@/utils/cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'brand';

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANT_MAP: Record<BadgeVariant, string> = {
  default: 'bg-slate-500/20 text-slate-400 border-slate-500/20',
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
  error: 'bg-red-500/20 text-red-400 border-red-500/20',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
  brand: 'bg-brand-500/20 text-brand-400 border-brand-500/20',
};

const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
  active: 'success',
  healthy: 'success',
  succeeded: 'success',
  completed: 'success',
  resolved: 'success',
  normal: 'success',
  open: 'info',
  in_progress: 'info',
  running: 'info',
  queued: 'warning',
  waiting: 'warning',
  pending: 'warning',
  pending_review: 'warning',
  expiring: 'warning',
  warning: 'warning',
  failed: 'error',
  error: 'error',
  critical: 'error',
  suspended: 'error',
  banned: 'error',
  revoked: 'error',
  cancelled: 'error',
  closed: 'default',
  inactive: 'default',
  expired: 'default',
  draft: 'default',
  unknown: 'default',
};

export const StatusBadge = memo(({ status, variant, className }: StatusBadgeProps) => {
  const resolvedVariant = variant || STATUS_VARIANT_MAP[status] || 'default';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', VARIANT_MAP[resolvedVariant], className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', {
        'bg-emerald-400': resolvedVariant === 'success',
        'bg-amber-400': resolvedVariant === 'warning',
        'bg-red-400': resolvedVariant === 'error',
        'bg-blue-400': resolvedVariant === 'info',
        'bg-brand-400': resolvedVariant === 'brand',
        'bg-slate-400': resolvedVariant === 'default',
      })} />
      {label}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';
