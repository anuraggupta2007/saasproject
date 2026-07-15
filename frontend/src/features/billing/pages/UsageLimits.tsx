import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, Database, FileArchive, Wifi, Users, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Progress } from '@/features/backup/components/ui/Progress';
import { UsageCard } from '../components/ui/UsageCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useUsageStats, useUsageHistory, useCurrentSubscription } from '../hooks';
import { cn } from '@/utils/cn';
import type { UsageStats } from '../types';

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

export const UsageLimits = memo(() => {
  const navigate = useNavigate();
  const { data: usage, isLoading } = useUsageStats();
  const { data: history } = useUsageHistory(30);
  const { data: subscription } = useCurrentSubscription();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="card" />
        <SkeletonLoader count={4} variant="stat" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/billing')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Usage & Limits</h1>
          <p className="text-slate-400 mt-1">Monitor your resource usage against plan limits</p>
        </div>
      </div>

      {usage && <UsageCard usage={usage} />}

      {usage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              label: 'Backup Jobs',
              used: usage.backupJobsUsed,
              limit: usage.backupJobsLimit,
              icon: <Database className="w-5 h-5" />,
              color: 'text-purple-400',
              bgColor: 'bg-purple-500/10',
              route: '/dashboard/backup',
            },
            {
              label: 'Conversion Jobs',
              used: usage.conversionJobsUsed,
              limit: usage.conversionJobsLimit,
              icon: <FileArchive className="w-5 h-5" />,
              color: 'text-blue-400',
              bgColor: 'bg-blue-500/10',
              route: '/dashboard/convert',
            },
            {
              label: 'Storage',
              used: usage.storageUsed,
              limit: usage.storageLimit,
              icon: <Wifi className="w-5 h-5" />,
              color: 'text-amber-400',
              bgColor: 'bg-amber-500/10',
              isBytes: true,
              route: '/dashboard/backup/storage',
            },
          ].map((item) => {
            const variant = getUsageVariant(item.used, item.limit);
            const isUnlimited = item.limit <= 0;
            const percentage = isUnlimited ? 0 : Math.min((item.used / item.limit) * 100, 100);

            return (
              <motion.div key={item.label} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Card variant="elevated" padding="lg" className="h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', item.bgColor, item.color)}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs text-slate-500">
                        {item.isBytes ? formatBytes(item.used) : item.used.toLocaleString()} / {isUnlimited ? '∞' : item.isBytes ? formatBytes(item.limit) : item.limit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {!isUnlimited && (
                    <Progress value={item.used} max={item.limit} variant={variant} size="sm" showLabel />
                  )}
                  {variant === 'error' && (
                    <Button variant="brand" size="sm" className="mt-3 w-full" onClick={() => navigate('/dashboard/billing/pricing')} rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Upgrade Plan
                    </Button>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {history && history.length > 0 && (
        <Card variant="elevated" padding="lg">
          <CardHeader title="Usage Trend" subtitle="Last 30 days" />
          <CardContent>
            <div className="h-64 flex items-end justify-center gap-1">
              {history.slice(-30).map((point, i) => {
                const maxUsage = Math.max(
                  ...history.slice(-30).map(p => Math.max(p.backupJobs, p.conversionJobs, p.apiRequests / 100))
                );
                const scale = maxUsage > 0 ? 100 / maxUsage : 1;
                return (
                  <motion.div
                    key={i}
                    className="flex-1 max-w-3 rounded-t bg-gradient-to-t from-brand-500 to-brand-400"
                    style={{ height: `${Math.max(5, (point.backupJobs + point.conversionJobs) * scale)}%` }}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(5, (point.backupJobs + point.conversionJobs) * scale)}%` }}
                    transition={{ delay: i * 0.02, duration: 0.4 }}
                  />
                );
              })}
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500" /> Backups</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> Conversions</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!subscription && (
        <Card variant="elevated" padding="lg">
          <CardContent className="text-center py-8">
            <p className="text-slate-400 mb-4">Upgrade to increase your limits</p>
            <Button variant="brand" onClick={() => navigate('/dashboard/billing/pricing')} leftIcon={<TrendingUp className="w-4 h-4" />}>
              View Plans
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

UsageLimits.displayName = 'UsageLimits';

export default UsageLimits;
