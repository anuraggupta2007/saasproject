import { memo } from 'react';
import { cn } from '@/utils/cn';
import type { SystemStatus } from '../../types';

interface MonitoringCardProps {
  name: string;
  status: SystemStatus;
  uptime?: number;
  responseTime?: number;
  errorRate?: number;
  details?: string;
  className?: string;
}

const STATUS_CONFIG: Record<SystemStatus, { color: string; label: string; glow: string }> = {
  healthy: { color: 'text-emerald-400', label: 'Healthy', glow: 'shadow-emerald-500/20' },
  warning: { color: 'text-amber-400', label: 'Warning', glow: 'shadow-amber-500/20' },
  critical: { color: 'text-red-400', label: 'Critical', glow: 'shadow-red-500/20' },
  unknown: { color: 'text-slate-400', label: 'Unknown', glow: '' },
};

export const MonitoringCard = memo(({ name, status, uptime, responseTime, errorRate, details, className }: MonitoringCardProps) => {
  const config = STATUS_CONFIG[status];

  return (
    <div className={cn('p-4 bg-white/5 border border-white/10 rounded-xl', className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white">{name}</h4>
        <span className={cn('flex items-center gap-1.5 text-xs font-medium', config.color)}>
          <span className={cn('w-2 h-2 rounded-full', {
            'bg-emerald-400': status === 'healthy',
            'bg-amber-400': status === 'warning',
            'bg-red-400': status === 'critical',
            'bg-slate-400': status === 'unknown',
          })} />
          {config.label}
        </span>
      </div>
      <div className="space-y-2">
        {uptime !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Uptime</span>
            <span className="text-white">{uptime.toFixed(2)}%</span>
          </div>
        )}
        {responseTime !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Response</span>
            <span className="text-white">{responseTime}ms</span>
          </div>
        )}
        {errorRate !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Error Rate</span>
            <span className={cn(errorRate > 5 ? 'text-red-400' : 'text-white')}>{errorRate}%</span>
          </div>
        )}
        {details && (
          <p className="text-xs text-slate-500 mt-2">{details}</p>
        )}
      </div>
    </div>
  );
});

MonitoringCard.displayName = 'MonitoringCard';
