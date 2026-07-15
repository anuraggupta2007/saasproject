import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Database, FileArchive, CheckCircle, XCircle, Clock, Download,
  TrendingUp, HardDrive, RefreshCw, Plus, ArrowRight,
  Zap, FileText, Shield
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Badge } from '@/features/backup/components/ui/Badge';
import { cn } from '@/utils/cn';
import { useDashboardStats, useDashboardActivity } from '../hooks';
import type { ActivityItem, JobType } from '../types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'backup_completed': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case 'backup_failed': return <XCircle className="w-4 h-4 text-red-400" />;
    case 'conversion_completed': return <Zap className="w-4 h-4 text-blue-400" />;
    case 'conversion_failed': return <XCircle className="w-4 h-4 text-red-400" />;
    case 'download_completed': return <Download className="w-4 h-4 text-purple-400" />;
    case 'report_generated': return <FileText className="w-4 h-4 text-amber-400" />;
    case 'job_deleted': return <XCircle className="w-4 h-4 text-slate-400" />;
    case 'job_retried': return <RefreshCw className="w-4 h-4 text-blue-400" />;
    default: return <Clock className="w-4 h-4 text-slate-400" />;
  }
}

function getActivityBadge(type: ActivityItem['type']) {
  if (type.includes('failed')) return <Badge variant="error" size="sm">Failed</Badge>;
  if (type.includes('completed')) return <Badge variant="success" size="sm">Success</Badge>;
  if (type.includes('deleted')) return <Badge variant="default" size="sm">Deleted</Badge>;
  if (type.includes('retried')) return <Badge variant="info" size="sm">Retried</Badge>;
  return <Badge variant="info" size="sm">{type}</Badge>;
}

export const HistoryDashboard = memo(() => {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useDashboardActivity(10);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">History & Downloads</h1>
          <p className="text-slate-400 mt-1">Overview of all backup and conversion jobs</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/dashboard/history/all')} leftIcon={<Clock className="w-4 h-4" />}>
            Full History
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard/history/downloads')} leftIcon={<Download className="w-4 h-4" />}>
            Downloads
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Backup Jobs', value: stats?.totalBackupJobs?.toLocaleString() || '0', icon: <Database className="w-6 h-6" />, variant: 'default' as const },
          { label: 'Total Conversion Jobs', value: stats?.totalConversionJobs?.toLocaleString() || '0', icon: <FileArchive className="w-6 h-6" />, variant: 'info' as const },
          { label: 'Successful Jobs', value: stats?.successfulJobs?.toLocaleString() || '0', icon: <CheckCircle className="w-6 h-6" />, variant: 'success' as const },
          { label: 'Failed Jobs', value: stats?.failedJobs?.toLocaleString() || '0', icon: <XCircle className="w-6 h-6" />, variant: (stats?.failedJobs && stats.failedJobs > 0 ? 'error' : 'success') as 'error' | 'success' },
        ].map((stat) => (
          <Card key={stat.label} variant="elevated" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{stat.label}</p>
                {statsLoading ? (
                  <div className="h-8 w-16 bg-white/5 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                )}
              </div>
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', {
                'bg-purple-500/10 text-purple-400': stat.variant === 'default',
                'bg-blue-500/10 text-blue-400': stat.variant === 'info',
                'bg-emerald-500/10 text-emerald-400': stat.variant === 'success',
                'bg-red-500/10 text-red-400': stat.variant === 'error',
              })}>
                {stat.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Success Rate</p>
              <p className="text-lg font-bold text-white">{stats?.successRate?.toFixed(1) || '0'}%</p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Downloads</p>
              <p className="text-lg font-bold text-white">{stats?.totalDownloads?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Storage Used</p>
              <p className="text-lg font-bold text-white">{stats?.totalStorageUsed ? formatBytes(stats.totalStorageUsed) : '0 B'}</p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Running Jobs</p>
              <p className="text-lg font-bold text-white">{stats?.runningJobs?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card variant="elevated" padding="lg" className="lg:col-span-2">
          <CardHeader
            title="Recent Activity"
            subtitle="Latest job updates"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/history/all')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            }
          />
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {activitiesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                  <div className="w-8 h-8 bg-white/5 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/5 rounded w-3/4" />
                    <div className="h-2 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : activities && activities.length > 0 ? (
              activities.map((activity) => (
                <motion.div
                  key={activity.id}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/[0.07] transition-colors cursor-pointer"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => navigate(`/dashboard/history/job/${activity.jobId}`)}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{activity.message}</p>
                    <p className="text-xs text-slate-500">{formatRelativeTime(activity.timestamp)}</p>
                  </div>
                  {getActivityBadge(activity.type)}
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader title="Quick Actions" subtitle="Common tasks" />
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" leftIcon={<Database className="w-4 h-4" />} onClick={() => navigate('/dashboard/backup')}>
              Backup Dashboard
            </Button>
            <Button variant="outline" className="w-full justify-start" leftIcon={<FileArchive className="w-4 h-4" />} onClick={() => navigate('/dashboard/convert')}>
              Converter Dashboard
            </Button>
            <Button variant="outline" className="w-full justify-start" leftIcon={<Download className="w-4 h-4" />} onClick={() => navigate('/dashboard/history/downloads')}>
              Download Center
            </Button>
            <Button variant="outline" className="w-full justify-start" leftIcon={<FileText className="w-4 h-4" />} onClick={() => navigate('/dashboard/history/reports')}>
              Reports
            </Button>
            <Button variant="outline" className="w-full justify-start" leftIcon={<Shield className="w-4 h-4" />} onClick={() => navigate('/dashboard/history/audit')}>
              Audit Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

HistoryDashboard.displayName = 'HistoryDashboard';

export default HistoryDashboard;
