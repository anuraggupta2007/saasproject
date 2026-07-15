import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Database, FileArchive, HardDrive, Wifi, Users, AlertTriangle } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Progress } from '@/features/backup/components/ui/Progress';
import { cn } from '@/utils/cn';
import type { UsageStats } from '../../types';

interface UsageCardProps {
  usage: UsageStats;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getUsageVariant(used: number, limit: number): 'default' | 'success' | 'warning' | 'error' {
  if (limit <= 0) return 'default';
  const pct = (used / limit) * 100;
  if (pct >= 90) return 'error';
  if (pct >= 70) return 'warning';
  return 'success';
}

export const UsageCard = memo(
  forwardRef<HTMLDivElement, UsageCardProps>(
    ({ usage, className }, ref) => {
      const items = [
        { label: 'Backup Jobs', used: usage.backupJobsUsed, limit: usage.backupJobsLimit, icon: <Database className="w-5 h-5" />, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
        { label: 'Conversion Jobs', used: usage.conversionJobsUsed, limit: usage.conversionJobsLimit, icon: <FileArchive className="w-5 h-5" />, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
        { label: 'Storage', used: usage.storageUsed, limit: usage.storageLimit, icon: <HardDrive className="w-5 h-5" />, color: 'text-amber-400', bgColor: 'bg-amber-500/10', isBytes: true },
        { label: 'API Requests', used: usage.apiRequestsUsed, limit: usage.apiRequestsLimit, icon: <Wifi className="w-5 h-5" />, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
        { label: 'Accounts', used: usage.accountsUsed, limit: usage.accountsLimit, icon: <Users className="w-5 h-5" />, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
      ];

      return (
        <Card ref={ref} variant="elevated" padding="lg" className={cn('', className)}>
          <h3 className="text-lg font-bold text-white mb-4">Usage & Limits</h3>
          <div className="space-y-4">
            {items.map((item) => {
              const variant = getUsageVariant(item.used, item.limit);
              const isUnlimited = item.limit <= 0;
              const percentage = isUnlimited ? 0 : Math.min((item.used / item.limit) * 100, 100);

              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', item.bgColor, item.color)}>
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium text-white">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-white">
                        {item.isBytes ? formatBytes(item.used) : item.used.toLocaleString()}
                      </span>
                      <span className="text-sm text-slate-500">
                        {' / '}
                        {isUnlimited ? '∞' : item.isBytes ? formatBytes(item.limit) : item.limit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {!isUnlimited && (
                    <Progress
                      value={item.used}
                      max={item.limit}
                      variant={variant}
                      size="sm"
                      showLabel={false}
                    />
                  )}
                  {variant === 'error' && (
                    <div className="flex items-center gap-1 text-xs text-red-400">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Near limit — consider upgrading</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      );
    }
  )
);

UsageCard.displayName = 'UsageCard';
