import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileArchive, Clock, CheckCircle, XCircle, Database, TrendingUp,
  Plus, Upload, History, Download, BarChart3, RefreshCw, ArrowRight,
  AlertCircle, Zap
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Badge } from '@/features/backup/components/ui/Badge';
import { ProgressCard } from '../components/ui/ProgressCard';
import { cn } from '@/utils/cn';
import { useDashboardStats, useDashboardActivity, useInfiniteConverterJobs } from '../hooks';
import type { ConversionActivity, ConversionStatus } from '../types';

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

function getActivityIcon(type: ConversionActivity['type']) {
  switch (type) {
    case 'upload_completed': return <Upload className="w-4 h-4 text-blue-400" />;
    case 'conversion_started': return <Zap className="w-4 h-4 text-brand-400" />;
    case 'conversion_completed': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case 'conversion_failed': return <XCircle className="w-4 h-4 text-red-400" />;
    case 'download_ready': return <Download className="w-4 h-4 text-purple-400" />;
    default: return <Clock className="w-4 h-4 text-slate-400" />;
  }
}

export const ConverterDashboard = memo(() => {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useDashboardActivity(10);
  const { data: recentJobs, isLoading: jobsLoading } = useInfiniteConverterJobs();

  const recentItems = recentJobs?.pages.flatMap(p => p.items).slice(0, 5) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Converter</h1>
          <p className="text-slate-400 mt-1">Convert email files between formats</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/dashboard/convert/history')} leftIcon={<History className="w-4 h-4" />}>
            History
          </Button>
          <Button variant="brand" onClick={() => navigate('/dashboard/convert/wizard')} leftIcon={<Plus className="w-4 h-4" />}>
            New Conversion
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProgressCard
          label="Total Jobs"
          value={stats?.totalJobs?.toLocaleString() || '0'}
          icon={<FileArchive className="w-6 h-6" />}
          variant="default"
          loading={statsLoading}
          change={stats?.totalJobs ? { value: 12, label: 'this month', positive: true } : undefined}
        />
        <ProgressCard
          label="Running Jobs"
          value={stats?.runningJobs?.toLocaleString() || '0'}
          icon={<RefreshCw className="w-6 h-6" />}
          variant="info"
          loading={statsLoading}
        />
        <ProgressCard
          label="Completed Jobs"
          value={stats?.completedJobs?.toLocaleString() || '0'}
          icon={<CheckCircle className="w-6 h-6" />}
          variant="success"
          loading={statsLoading}
          change={stats?.completedJobs ? { value: 8, label: 'vs last month', positive: true } : undefined}
        />
        <ProgressCard
          label="Failed Jobs"
          value={stats?.failedJobs?.toLocaleString() || '0'}
          icon={<XCircle className="w-6 h-6" />}
          variant={stats?.failedJobs && stats.failedJobs > 0 ? 'error' : 'success'}
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ProgressCard
          label="Total Files Converted"
          value={stats?.totalFilesConverted?.toLocaleString() || '0'}
          icon={<Database className="w-6 h-6" />}
          variant="default"
          loading={statsLoading}
        />
        <ProgressCard
          label="Total Data Processed"
          value={stats?.totalDataProcessed ? formatBytes(stats.totalDataProcessed) : '0 B'}
          icon={<BarChart3 className="w-6 h-6" />}
          variant="info"
          loading={statsLoading}
        />
        <ProgressCard
          label="Success Rate"
          value={stats?.successRate ? `${stats.successRate.toFixed(1)}%` : '100%'}
          icon={<TrendingUp className="w-6 h-6" />}
          variant={stats?.successRate && stats.successRate >= 90 ? 'success' : 'warning'}
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="elevated" padding="lg">
          <CardHeader
            title="Recent Conversion Jobs"
            subtitle="Latest conversion activity"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/convert/history')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            }
          />
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {jobsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-white/5 rounded-xl" />
                </div>
              ))
            ) : recentItems.length > 0 ? (
              recentItems.map((job) => (
                <motion.div
                  key={job.id}
                  className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(`/dashboard/convert/progress/${job.id}`)}
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                    <FileArchive className="w-5 h-5 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{job.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {job.inputFiles[0]?.format.toUpperCase()} → {job.outputFormats.map(f => f.toUpperCase()).join(', ')}
                    </p>
                  </div>
                  <Badge variant={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'error' : 'info'} size="sm">
                    {job.status}
                  </Badge>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <FileArchive className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p>No conversion jobs yet</p>
                <Button variant="brand" className="mt-3" onClick={() => navigate('/dashboard/convert/wizard')} leftIcon={<Plus className="w-4 h-4" />}>
                  Start First Conversion
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader title="Recent Activity" subtitle="Latest updates" />
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
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{activity.message}</p>
                    <p className="text-xs text-slate-500">{formatRelativeTime(activity.timestamp)}</p>
                  </div>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card variant="elevated" padding="lg" className="lg:col-span-2">
          <CardHeader
            title="Conversion Analytics"
            subtitle="Last 30 days"
            action={<Button variant="ghost" size="sm" leftIcon={<BarChart3 className="w-4 h-4" />}>View Charts</Button>}
          />
          <CardContent>
            <div className="h-64 flex items-end justify-center gap-2">
              {Array.from({ length: 14 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="flex-1 max-w-8 rounded-t bg-gradient-to-t from-brand-500 to-brand-400"
                  style={{ height: `${Math.max(20, Math.random() * 100)}%` }}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(20, Math.random() * 100)}%` }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                />
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-500" /> Completed</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> Running</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Failed</span>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader title="Quick Actions" subtitle="Common tasks" />
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/dashboard/convert/wizard')}>
              New Conversion
            </Button>
            <Button variant="outline" className="w-full justify-start" leftIcon={<Upload className="w-4 h-4" />} onClick={() => navigate('/dashboard/convert/upload')}>
              Upload Files
            </Button>
            <Button variant="outline" className="w-full justify-start" leftIcon={<History className="w-4 h-4" />} onClick={() => navigate('/dashboard/convert/history')}>
              View History
            </Button>
            <Button variant="outline" className="w-full justify-start" leftIcon={<Download className="w-4 h-4" />} onClick={() => navigate('/dashboard/convert/downloads')}>
              Download Center
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

ConverterDashboard.displayName = 'ConverterDashboard';

export default ConverterDashboard;
