import { memo, useState } from 'react';
import { Search, RefreshCw, XCircle, FileText, Activity } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { Progress } from '@/features/backup/components/ui/Progress';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useAdminJobs, useRetryJob, useCancelJob, useJobLogs } from '../hooks';
import { useAdminStore } from '../store';
import { toast } from 'react-hot-toast';
import { cn } from '@/utils/cn';
import type { AdminJob } from '../types';

export const JobMonitoring = memo(() => {
  const { jobs, setJobFilters } = useAdminStore();
  const { data, isLoading } = useAdminJobs({ page: jobs.page, type: jobs.type, status: jobs.status, userId: jobs.search });
  const retryJob = useRetryJob();
  const cancelJob = useCancelJob();

  const [showLogs, setShowLogs] = useState<string | null>(null);

  const columns: DataTableColumn<AdminJob>[] = [
    { key: 'type', label: 'Type', render: (j) => (
      <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', j.type === 'backup' ? 'text-blue-400' : 'text-purple-400')}>
        {j.type === 'backup' ? <Activity className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
        {j.type}
      </span>
    )},
    { key: 'userName', label: 'User', render: (j) => <span className="text-white">{j.userName}</span> },
    { key: 'status', label: 'Status', render: (j) => <StatusBadge status={j.status} /> },
    { key: 'progress', label: 'Progress', render: (j) => (
      <div className="w-24">
        <Progress value={j.progress} size="sm" />
        <span className="text-xs text-slate-500 mt-1">{j.progress}%</span>
      </div>
    )},
    { key: 'duration', label: 'Duration', render: (j) => j.duration ? <span className="text-slate-400">{Math.round(j.duration / 1000)}s</span> : <span className="text-slate-500">-</span> },
    { key: 'errors', label: 'Errors', render: (j) => j.errors.length > 0 ? (
      <span className="text-red-400 text-xs">{j.errors.length} error(s)</span>
    ) : <span className="text-slate-500">-</span> },
    { key: 'actions', label: '', render: (j) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" onClick={() => setShowLogs(j.id)} leftIcon={<FileText className="w-3 h-3" />}>Logs</Button>
        {j.status === 'failed' && <Button variant="ghost" size="sm" onClick={() => retryJob.mutate(j.id, { onSuccess: () => toast.success('Job retrying') })} leftIcon={<RefreshCw className="w-3 h-3" />}>Retry</Button>}
        {(j.status === 'queued' || j.status === 'running') && <Button variant="ghost" size="sm" onClick={() => cancelJob.mutate(j.id, { onSuccess: () => toast.success('Job cancelled') })} leftIcon={<XCircle className="w-3 h-3" />}>Cancel</Button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Job Monitoring</h1>
        <p className="text-slate-400 mt-1">Monitor backup and conversion jobs</p>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Select value={jobs.type} onValueChange={(v) => setJobFilters({ type: v, page: 1 })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="backup">Backup</SelectItem>
              <SelectItem value="conversion">Conversion</SelectItem>
            </SelectContent>
          </Select>
          <Select value={jobs.status} onValueChange={(v) => setJobFilters({ status: v, page: 1 })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <SkeletonLoader count={5} variant="row" /> : (
          <DataTable columns={columns} data={data?.items ?? []} emptyMessage="No jobs found" />
        )}
      </Card>
    </div>
  );
});

JobMonitoring.displayName = 'JobMonitoring';

export default JobMonitoring;
