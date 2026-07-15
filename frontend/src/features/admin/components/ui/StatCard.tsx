import { memo } from 'react';
import { cn } from '@/utils/cn';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
}

export const StatCard = memo(({ label, value, change, icon: Icon, iconColor = 'text-brand-400', className }: StatCardProps) => {
  return (
    <div className={cn('p-4 bg-white/5 border border-white/10 rounded-xl', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change !== undefined && (
            <p className={cn('text-xs mt-1', change >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {change >= 0 ? '+' : ''}{change}% vs last period
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl bg-white/5', iconColor)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';
