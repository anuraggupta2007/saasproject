import { memo } from 'react';
import { TrendingUp, Users, DollarSign, Zap, Globe, Monitor, Smartphone, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { EmptyState } from '../components/ui/EmptyState';
import { useAdminAnalytics } from '../hooks';
import { cn } from '@/utils/cn';

const BarChartSimple = ({ data, labelKey, valueKey, maxValue }: { data: Array<Record<string, string | number>>; labelKey: string; valueKey: string; maxValue?: number }) => {
  const max = maxValue || Math.max(...data.map((d) => Number(d[valueKey]) || 0));
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const pct = max > 0 ? (val / max) * 100 : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-slate-400">{val}</span>
            <div className="w-full bg-brand-500/30 rounded-t-md transition-all" style={{ height: `${pct}%`, minHeight: '4px' }} />
            <span className="text-[10px] text-slate-500 truncate w-full text-center">{String(d[labelKey])}</span>
          </div>
        );
      })}
    </div>
  );
};

const PieChartSimple = ({ data, labelKey, valueKey }: { data: Array<Record<string, string | number>>; labelKey: string; valueKey: string }) => {
  const total = data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0);
  const colors = ['bg-brand-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500'];
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const pct = total > 0 ? (val / total) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className={cn('w-3 h-3 rounded-full', colors[i % colors.length])} />
            <span className="flex-1 text-sm text-white">{String(d[labelKey])}</span>
            <span className="text-sm text-slate-400">{val}</span>
            <span className="text-xs text-slate-500 w-12 text-right">{pct.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
};

export const AnalyticsDashboard = memo(() => {
  const { data: analytics, isLoading } = useAdminAnalytics();

  if (isLoading) return <SkeletonLoader count={4} variant="card" />;

  const a = analytics;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
        <p className="text-slate-400 mt-1">Platform performance and usage insights</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Conversion Success Rate" value={`${a?.conversionStats.successRate ?? 0}%`} icon={Zap} iconColor="text-emerald-400" />
        <StatCard label="Backup Success Rate" value={`${a?.backupStats.successRate ?? 0}%`} icon={TrendingUp} iconColor="text-blue-400" />
        <StatCard label="Total Conversions" value={a?.conversionStats.total ?? 0} icon={BarChart3} iconColor="text-purple-400" />
        <StatCard label="Total Backups" value={a?.backupStats.total ?? 0} icon={Zap} iconColor="text-brand-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated" padding="lg">
          <CardHeader title="User Growth" icon={<Users className="w-5 h-5" />} />
          <CardContent>
            {a?.userGrowth && a.userGrowth.length > 0 ? (
              <BarChartSimple data={a.userGrowth} labelKey="date" valueKey="total" />
            ) : (
              <EmptyState title="No data available" />
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader title="Revenue Growth" icon={<DollarSign className="w-5 h-5" />} />
          <CardContent>
            {a?.revenueGrowth && a.revenueGrowth.length > 0 ? (
              <BarChartSimple data={a.revenueGrowth} labelKey="date" valueKey="mrr" />
            ) : (
              <EmptyState title="No data available" />
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader title="Feature Usage" icon={<Zap className="w-5 h-5" />} />
          <CardContent>
            {a?.featureUsage && a.featureUsage.length > 0 ? (
              <PieChartSimple data={a.featureUsage} labelKey="feature" valueKey="users" />
            ) : (
              <EmptyState title="No data available" />
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader title="Browser Usage" icon={<Monitor className="w-5 h-5" />} />
          <CardContent>
            {a?.browserUsage && a.browserUsage.length > 0 ? (
              <PieChartSimple data={a.browserUsage} labelKey="browser" valueKey="users" />
            ) : (
              <EmptyState title="No data available" />
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader title="Device Usage" icon={<Smartphone className="w-5 h-5" />} />
          <CardContent>
            {a?.deviceUsage && a.deviceUsage.length > 0 ? (
              <PieChartSimple data={a.deviceUsage} labelKey="device" valueKey="users" />
            ) : (
              <EmptyState title="No data available" />
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader title="Geographic Distribution" icon={<Globe className="w-5 h-5" />} />
          <CardContent>
            {a?.geoDistribution && a.geoDistribution.length > 0 ? (
              <PieChartSimple data={a.geoDistribution.slice(0, 8)} labelKey="country" valueKey="users" />
            ) : (
              <EmptyState title="No data available" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

AnalyticsDashboard.displayName = 'AnalyticsDashboard';

export default AnalyticsDashboard;
