import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FolderArchive,
  Database,
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  BarChart3,
  HardDrive,
  Settings,
  Search,
  Filter,
  MoreVertical,
  ChevronRight,
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardContent, CardFooter, Badge, Button, Avatar, AvatarGroup, StatusBadge } from '../components/ui';
import { Progress } from '../components/ui/Progress';
import { cn } from '@/utils/cn';
import { formatBytes, formatRelativeTime, formatDuration } from '@/utils/format';
import { backupApi } from '../api';
import type { BackupJob, ConnectedAccount, StorageUsage } from '../types';
import { useBackupStore } from '../store';

const StatCard = memo(({ title, value, change, icon: Icon, variant = 'default', loading = false }: {
  title: string;
  value: string | number;
  change?: { value: number; label: string; positive?: boolean };
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
}) => {
  const variantStyles = {
    default: 'border-brand-500/20',
    success: 'border-emerald-500/20',
    warning: 'border-amber-500/20',
    error: 'border-red-500/20',
    info: 'border-blue-500/20',
  };

  if (loading) {
    return (
      <Card variant="outlined" padding="lg" className={variantStyles[variant]}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/5 rounded w-1/3" />
          <div className="h-8 bg-white/5 rounded w-1/2" />
          <div className="h-3 bg-white/5 rounded w-1/4" />
        </div>
      </Card>
    );
  }

  return (
    <Card variant="outlined" padding="lg" className={variantStyles[variant]}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn('text-sm font-medium', change.positive ? 'text-emerald-400' : 'text-red-400')}>
                {change.positive ? '+' : ''}{change.value}%
              </span>
              <span className="text-sm text-slate-500">{change.label}</span>
            </div>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', {
          'bg-brand-500/10 text-brand-400': variant === 'default',
          'bg-emerald-500/10 text-emerald-400': variant === 'success',
          'bg-amber-500/10 text-amber-400': variant === 'warning',
          'bg-red-500/10 text-red-400': variant === 'error',
          'bg-blue-500/10 text-blue-400': variant === 'info',
        })}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

const RecentJobCard = memo(({ job }: { job: BackupJob }) => {
  const statusConfig = {
    completed: { variant: 'success' as const, icon: CheckCircle },
    failed: { variant: 'error' as const, icon: XCircle },
    running: { variant: 'info' as const, icon: RefreshCw },
    paused: { variant: 'warning' as const, icon: Clock },
    pending: { variant: 'neutral' as const, icon: Clock },
    cancelled: { variant: 'neutral' as const, icon: XCircle },
  };

  const config = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <motion.div
      className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
      whileHover={{ x: 4 }}
    >
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', {
        'bg-emerald-500/10 text-emerald-400': config.variant === 'success',
        'bg-red-500/10 text-red-400': config.variant === 'error',
        'bg-blue-500/10 text-blue-400': config.variant === 'info',
        'bg-amber-500/10 text-amber-400': config.variant === 'warning',
        'bg-slate-500/10 text-slate-400': config.variant === 'neutral',
      })}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-white truncate">{job.name}</h4>
          <StatusBadge status={job.status} size="sm" />
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
          <span className="flex items-center gap-1">
            <FolderArchive className="w-3.5 h-3.5" />
            {job.stats.foldersProcessed} folders
          </span>
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5" />
              {(job.stats as any).processedMessages ?? job.stats.totalEmails} emails
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" />
              {formatBytes(job.stats.totalSize)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration((job as any).stats.duration ?? 0)}
            </span>
        </div>
        {job.progress && job.status === 'running' && (
          <Progress value={job.progress.percentage} size="sm" showLabel className="mt-2" />
        )}
      </div>
      <div className="text-right text-sm text-slate-500">
        <p>{formatRelativeTime(job.startedAt ?? job.createdAt)}</p>
        {job.completedAt && <p className="text-xs">Finished {formatRelativeTime(job.completedAt)}</p>}
      </div>
    </motion.div>
  );
});

RecentJobCard.displayName = 'RecentJobCard';

const AccountStatusCard = memo(({ account }: { account: ConnectedAccount }) => {
  const storagePercent = account.stats.storageLimit > 0 ? (account.stats.storageUsed / account.stats.storageLimit) * 100 : 0;

  return (
    <motion.div
      className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
      whileHover={{ x: 4 }}
    >
      <Avatar src={account.avatarUrl} name={account.displayName} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-white truncate">{account.displayName}</h4>
          <StatusBadge status={account.status} size="sm" />
        </div>
        <p className="text-sm text-slate-400 truncate">{account.email}</p>
        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
          <span className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5" />
            {account.stats.totalEmails.toLocaleString()} emails
          </span>
          <span className="flex items-center gap-1">
            <FolderArchive className="w-3.5 h-3.5" />
            {account.stats.folderCount} folders
          </span>
        </div>
        {account.stats.storageLimit > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Storage</span>
              <span>{formatBytes(account.stats.storageUsed)} / {formatBytes(account.stats.storageLimit)}</span>
            </div>
            <Progress value={storagePercent} size="sm" variant={storagePercent > 90 ? 'error' : storagePercent > 70 ? 'warning' : 'success'} />
          </div>
        )}
        {account.lastSyncAt && (
          <p className="text-xs text-slate-500 mt-1">Last sync: {formatRelativeTime(account.lastSyncAt)}</p>
        )}
      </div>
    </motion.div>
  );
});

AccountStatusCard.displayName = 'AccountStatusCard';

export const BackupDashboard = memo(() => {
  const navigate = useNavigate();
  const { accounts, jobs, filters, setJobFilters } = useBackupStore();

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['backup', 'accounts', 'list'],
    queryFn: () => backupApi.accounts.list({ limit: 50 }),
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['backup', 'jobs', 'list', filters.jobs],
    queryFn: () => backupApi.jobs.list({ limit: 10, filter: { ...filters.jobs, accountId: filters.jobs.accountId ? [filters.jobs.accountId] : undefined } as any }),
  });

  const { data: storageData, isLoading: storageLoading } = useQuery({
    queryKey: ['backup', 'storage', 'usage'],
    queryFn: backupApi.storage.usage,
  });

  const totalAccounts = accountsData?.items.length ?? 0;
  const connectedAccounts = accountsData?.items.filter((a: ConnectedAccount) => a.status === 'connected').length ?? 0;
  const activeJobs = jobsData?.items.filter((j: BackupJob) => ['running', 'queued', 'paused'].includes(j.status)).length ?? 0;
  const completedToday = jobsData?.items.filter((j: BackupJob) =>
    j.status === 'completed' && j.completedAt && new Date(j.completedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length ?? 0;
  const failedJobs = jobsData?.items.filter((j: BackupJob) => j.status === 'failed').length ?? 0;
  const totalEmails = jobsData?.items.reduce((sum: number, j: BackupJob) => sum + j.stats.totalEmails, 0) ?? 0;
  const totalStorage = storageData?.used ?? 0;
  const storageLimit = storageData?.limit ?? 0;
  const successRate = jobsData?.items.length
    ? ((jobsData.items.filter(j => j.status === 'completed').length / jobsData.items.length) * 100).toFixed(1)
    : '100';
  const latestBackup = jobsData?.items[0]?.completedAt ?? jobsData?.items[0]?.startedAt;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Backup Dashboard</h1>
          <p className="text-slate-400 mt-1">Monitor and manage your email backups</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />} onClick={() => setJobFilters({ ...filters.jobs, status: undefined })}>
            Filters
          </Button>
          <Button variant="brand" onClick={() => navigate('/dashboard/backup/wizard')} leftIcon={<Plus className="w-4 h-4" />}>
            New Backup Job
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Statistics">
        <StatCard
          title="Connected Accounts"
          value={connectedAccounts}
          change={{ value: 12, label: 'vs last month', positive: true }}
          icon={FolderArchive}
          variant="default"
          loading={accountsLoading}
        />
        <StatCard
          title="Active Jobs"
          value={activeJobs}
          change={{ value: 5, label: 'running now', positive: false }}
          icon={RefreshCw}
          variant="info"
          loading={jobsLoading}
        />
        <StatCard
          title="Completed Today"
          value={completedToday}
          change={{ value: 23, label: 'vs yesterday', positive: true }}
          icon={CheckCircle}
          variant="success"
          loading={jobsLoading}
        />
        <StatCard
          title="Failed Jobs"
          value={failedJobs}
          change={{ value: failedJobs > 0 ? 100 : 0, label: 'needs attention', positive: false }}
          icon={XCircle}
          variant={failedJobs > 0 ? 'error' : 'success'}
          loading={jobsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" role="region" aria-label="Additional Statistics">
        <StatCard
          title="Total Emails Backed Up"
          value={totalEmails.toLocaleString()}
          change={{ value: 8, label: 'this week', positive: true }}
          icon={Database}
          variant="default"
          loading={jobsLoading}
        />
        <StatCard
          title="Storage Used"
          value={`${((totalStorage / (storageLimit || 1)) * 100).toFixed(1)}%`}
          change={{ value: totalStorage, label: `${formatBytes(totalStorage)} of ${formatBytes(storageLimit)}`, positive: totalStorage / (storageLimit || 1) < 0.8 }}
          icon={HardDrive}
          variant={totalStorage / (storageLimit || 1) > 0.9 ? 'error' : totalStorage / (storageLimit || 1) > 0.7 ? 'warning' : 'success'}
          loading={storageLoading}
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          change={{ value: 0.2, label: 'vs last month', positive: true }}
          icon={TrendingUp}
          variant={parseFloat(successRate) < 90 ? 'warning' : 'success'}
          loading={jobsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="elevated" padding="lg">
          <CardHeader
            title="Recent Backup Jobs"
            subtitle="Latest backup activity"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/backup/history')} rightIcon={<ChevronRight className="w-4 h-4" />}>
                View All
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
            ) : jobsData?.items.length ? (
              jobsData.items.slice(0, 5).map((job) => (
                <RecentJobCard key={job.id} job={job} />
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <FolderArchive className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p>No backup jobs yet</p>
                <Button variant="brand" className="mt-3" onClick={() => navigate('/dashboard/backup/wizard')} leftIcon={<Plus className="w-4 h-4" />}>
                  Create First Job
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader
            title="Connected Accounts"
            subtitle={ `${connectedAccounts} of ${totalAccounts} connected` }
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/backup/accounts')} rightIcon={<ChevronRight className="w-4 h-4" />}>
                Manage
              </Button>
            }
          />
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {accountsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-white/5 rounded-xl" />
                </div>
              ))
            ) : accountsData?.items.length ? (
              accountsData.items.slice(0, 5).map((account) => (
                <AccountStatusCard key={account.id} account={account} />
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <FolderArchive className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p>No accounts connected</p>
                <Button variant="brand" className="mt-3" onClick={() => navigate('/dashboard/backup/connect')} leftIcon={<Plus className="w-4 h-4" />}>
                  Connect Account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card variant="elevated" padding="lg" className="lg:col-span-2">
          <CardHeader
            title="Backup Activity"
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
          <CardHeader
            title="Quick Actions"
            subtitle="Common tasks"
          />
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/dashboard/backup/wizard')}>
              Create Backup Job
            </Button>
            <Button variant="outline" className="w-full justify-start" leftIcon={<FolderArchive className="w-4 h-4" />} onClick={() => navigate('/dashboard/backup/connect')}>
              Connect Email Account
            </Button>
            <Button variant="outline" className="w-full justify-start" leftIcon={<Settings className="w-4 h-4" />} onClick={() => navigate('/dashboard/backup/schedules')}>
              Manage Schedules
            </Button>
            <Button variant="outline" className="w-full justify-start" leftIcon={<Search className="w-4 h-4" />} onClick={() => navigate('/dashboard/backup/history')}>
              View History
            </Button>
            <Button variant="outline" className="w-full justify-start" leftIcon={<HardDrive className="w-4 h-4" />} onClick={() => navigate('/dashboard/backup/storage')}>
              Storage Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

BackupDashboard.displayName = 'BackupDashboard';

export default BackupDashboard;