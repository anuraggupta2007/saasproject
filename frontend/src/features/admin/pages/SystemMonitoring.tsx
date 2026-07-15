import { memo } from 'react';
import { Server, Database, Wifi, Activity, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { MonitoringCard } from '../components/ui/MonitoringCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useSystemHealth } from '../hooks';
import { cn } from '@/utils/cn';

export const SystemMonitoring = memo(() => {
  const { data: health, isLoading, refetch } = useSystemHealth();

  if (isLoading) return <SkeletonLoader count={4} variant="card" />;

  const h = health;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Monitoring</h1>
          <p className="text-slate-400 mt-1">Real-time infrastructure status</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="System Health Score" value={`${h?.score ?? 0}%`} icon={Activity} iconColor={h?.overall === 'healthy' ? 'text-emerald-400' : h?.overall === 'warning' ? 'text-amber-400' : 'text-red-400'} />
        <StatCard label="API Requests/min" value={h?.metrics.apiRequestsPerMinute ?? 0} icon={Server} iconColor="text-blue-400" />
        <StatCard label="Avg Response Time" value={`${h?.metrics.avgResponseTime ?? 0}ms`} icon={Clock} iconColor="text-brand-400" />
        <StatCard label="Active Workers" value={h?.metrics.activeWorkers ?? 0} icon={Wifi} iconColor="text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {h?.services.map((svc) => (
          <MonitoringCard key={svc.name} name={svc.name} status={svc.status} uptime={svc.uptime} responseTime={svc.responseTime} errorRate={svc.errorRate} />
        ))}
      </div>

      <Card variant="elevated" padding="lg">
        <CardHeader title="Infrastructure Metrics" icon={<Database className="w-5 h-5" />} />
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'CPU', value: h?.metrics.cpu ?? 0, icon: '🔴' },
              { label: 'Memory', value: h?.metrics.memory ?? 0, icon: '🟠' },
              { label: 'Storage', value: h?.metrics.storage ?? 0, icon: '🟣' },
              { label: 'Network', value: h?.metrics.network ?? 0, icon: '🔵' },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-3">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="35" fill="none"
                      stroke={m.value > 80 ? '#ef4444' : m.value > 60 ? '#f59e0b' : '#009688'}
                      strokeWidth="6"
                      strokeDasharray={`${(m.value / 100) * 220} 220`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">{m.value}%</span>
                </div>
                <p className="text-sm font-medium text-white">{m.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card variant="elevated" padding="lg">
        <CardHeader title="Queue & Workers" icon={<Activity className="w-5 h-5" />} />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white/5 rounded-xl text-center">
              <p className="text-3xl font-bold text-white">{h?.metrics.queueSize ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">Queue Size</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl text-center">
              <p className="text-3xl font-bold text-white">{h?.metrics.activeWorkers ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">Active Workers</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl text-center">
              <p className="text-3xl font-bold text-white">{h?.metrics.avgResponseTime ?? 0}ms</p>
              <p className="text-xs text-slate-400 mt-1">Avg Response Time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

SystemMonitoring.displayName = 'SystemMonitoring';

export default SystemMonitoring;
