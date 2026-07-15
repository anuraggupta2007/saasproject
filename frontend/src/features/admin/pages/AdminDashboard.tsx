import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, CreditCard, Key, Activity, Shield, AlertTriangle,
  TrendingUp, Database, Clock, Server
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { EmptyState } from '../components/ui/EmptyState';
import { useDashboardStats, useSystemHealth } from '../hooks';
import { ROUTES } from '@/routes/constants';
import { cn } from '@/utils/cn';

const QuickActionCard = ({ icon, label, route, count }: { icon: React.ReactNode; label: string; route: string; count?: number }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(route)}
      className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left w-full"
    >
      <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {count !== undefined && <p className="text-xs text-slate-500">{count} total</p>}
      </div>
    </button>
  );
};

export const AdminDashboard = memo(() => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: health, isLoading: healthLoading } = useSystemHealth();

  if (statsLoading) {
    return <SkeletonLoader count={2} variant="stat" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 mt-1">Platform overview and management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers ?? 0} icon={Users} change={12} iconColor="text-blue-400" />
        <StatCard label="Active Subscriptions" value={stats?.activeSubscriptions ?? 0} icon={CreditCard} change={8} iconColor="text-emerald-400" />
        <StatCard label="Revenue" value={`$${(stats?.revenue ?? 0).toLocaleString()}`} icon={TrendingUp} change={15} iconColor="text-brand-400" />
        <StatCard label="System Health" value={`${stats?.systemHealthScore ?? 0}%`} icon={Shield} iconColor="text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="New Users Today" value={stats?.newUsersToday ?? 0} icon={Users} iconColor="text-cyan-400" />
        <StatCard label="Online Users" value={stats?.onlineUsers ?? 0} icon={Activity} iconColor="text-amber-400" />
        <StatCard label="API Requests" value={stats?.apiRequests?.toLocaleString() ?? '0'} icon={Server} iconColor="text-purple-400" />
        <StatCard label="Storage Usage" value={`${((stats?.storageUsage ?? 0) / 1073741824).toFixed(1)} GB`} icon={Database} iconColor="text-rose-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="elevated" padding="lg" className="lg:col-span-2">
          <CardHeader title="Quick Actions" icon={<Clock className="w-5 h-5" />} />
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuickActionCard icon={<Users className="w-5 h-5" />} label="Manage Users" route={ROUTES.ADMIN_USERS} count={stats?.totalUsers} />
              <QuickActionCard icon={<Key className="w-5 h-5" />} label="License Management" route={ROUTES.ADMIN_LICENSES} count={stats?.activeLicenses} />
              <QuickActionCard icon={<CreditCard className="w-5 h-5" />} label="Payment History" route={ROUTES.ADMIN_PAYMENTS} />
              <QuickActionCard icon={<Activity className="w-5 h-5" />} label="Support Tickets" route={ROUTES.ADMIN_SUPPORT} />
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader title="System Status" icon={<Server className="w-5 h-5" />} />
          <CardContent className="space-y-3">
            {healthLoading ? (
              <SkeletonLoader count={4} variant="row" />
            ) : health?.services ? (
              health.services.map((svc) => (
                <div key={svc.name} className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-300">{svc.name}</span>
                  <StatusBadge status={svc.status} />
                </div>
              ))
            ) : (
              <EmptyState title="No services configured" />
            )}
          </CardContent>
        </Card>
      </div>

      {health && (
        <Card variant="elevated" padding="lg">
          <CardHeader title="Infrastructure Metrics" icon={<Database className="w-5 h-5" />} />
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'CPU', value: health.metrics.cpu },
                { label: 'Memory', value: health.metrics.memory },
                { label: 'Storage', value: health.metrics.storage },
                { label: 'Network', value: health.metrics.network },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                      <circle
                        cx="32" cy="32" r="28" fill="none"
                        stroke={m.value > 80 ? '#ef4444' : m.value > 60 ? '#f59e0b' : '#009688'}
                        strokeWidth="4"
                        strokeDasharray={`${(m.value / 100) * 176} 176`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{m.value}%</span>
                  </div>
                  <p className="text-xs text-slate-400">{m.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

AdminDashboard.displayName = 'AdminDashboard';

export default AdminDashboard;
