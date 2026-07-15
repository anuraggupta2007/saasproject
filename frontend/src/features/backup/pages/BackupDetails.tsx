import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Trash2, RefreshCw, Calendar, Clock, Database,
  FolderArchive, Mail, CheckCircle, AlertCircle, XCircle, Loader2,
  BarChart3, PieChart, Activity, FileText, ChevronDown, ChevronRight, HardDrive, Settings, MoreVertical
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter, Button, Badge, Avatar, DropdownButton } from '../components/ui';
import { Progress } from '../components/ui/Progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { StatusBadge } from '../components/ui/Badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/Select';
import { backupApi } from '../api';
import { useHistoryDetails, useDeleteHistoryItem } from '../hooks';
import { cn } from '@/utils/cn';
import { formatBytes, formatDuration, formatRelativeTime } from '@/utils/format';
import { toast } from 'react-hot-toast';
import type { BackupHistoryDetails, LogEntry, TimelineEvent, FolderBreakdown, ErrorBreakdown, PerformanceMetrics } from '../types';

const statusConfig = {
  completed: { variant: 'success' as const, icon: CheckCircle, label: 'Completed' },
  completed_with_errors: { variant: 'warning' as const, icon: AlertCircle, label: 'Completed with Errors' },
  failed: { variant: 'error' as const, icon: XCircle, label: 'Failed' },
  cancelled: { variant: 'neutral' as const, icon: XCircle, label: 'Cancelled' },
  running: { variant: 'info' as const, icon: Loader2, label: 'Running' },
  paused: { variant: 'warning' as const, icon: Clock, label: 'Paused' },
  pending: { variant: 'neutral' as const, icon: Clock, label: 'Pending' },
  queued: { variant: 'neutral' as const, icon: Clock, label: 'Queued' },
  retrying: { variant: 'info' as const, icon: RefreshCw, label: 'Retrying' },
};

export const BackupDetails = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');

  const { data: details, isLoading, error } = useHistoryDetails(id!);
  const deleteMutation = useDeleteHistoryItem();

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this backup history entry? This action cannot be undone.')) {
      deleteMutation.mutate(id!, {
        onSuccess: () => {
          toast.success('Backup history deleted');
          navigate('/dashboard/backup/history');
        },
        onError: () => toast.error('Failed to delete'),
      });
    }
  };

  const handleRetry = () => {
    // TODO: Implement retry from history
    toast('Retry functionality coming soon');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white">Backup Not Found</h2>
        <Button variant="brand" onClick={() => navigate('/dashboard/backup/history')} className="mt-4">
          Back to History
        </Button>
      </div>
    );
  }

  const config = statusConfig[details.status as keyof typeof statusConfig] || statusConfig.completed;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/backup/history')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white capitalize">{details.backupType.replace('_', ' ')} Backup</h1>
            <p className="text-slate-400">{details.accountEmail} · {details.provider}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={details.status} size="lg" />
          <DropdownButton
            items={[
              { label: 'Download Report', icon: <Download className="w-4 h-4" />, onClick: () => { /* download */ } },
              { label: 'Retry Backup', icon: <RefreshCw className="w-4 h-4" />, onClick: handleRetry },
              { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: handleDelete, danger: true },
            ]}
            variant="ghost"
            size="sm"
          >
            <MoreVertical className="w-4 h-4 text-slate-400 hover:text-white" />
          </DropdownButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-white/5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="folders">Folders</TabsTrigger>
              <TabsTrigger value="errors">Errors</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Emails Processed" value={details.emailsProcessed?.toLocaleString()} icon={Mail} />
                <StatCard label="Total Size" value={formatBytes(details.size || 0)} icon={Database} />
                <StatCard label="Attachments" value={details.attachmentCount?.toLocaleString()} icon={FileText} />
                <StatCard label="Folders" value={details.folderCount?.toLocaleString()} icon={FolderArchive} />
                <StatCard label="Duration" value={details.duration ? formatDuration(details.duration) : '—'} icon={Clock} />
                <StatCard label="Compressed Size" value={details.compressedSize ? formatBytes(details.compressedSize) : '—'} icon={Database} />
                <StatCard label="Compression Ratio" value={details.settingsSnapshot?.compression?.enabled ? `${((details.size || 0) / (details.compressedSize || 1) * 100).toFixed(1)}%` : 'N/A'} icon={Database} />
                <StatCard label="Avg Speed" value={`${formatBytes((details.size || 0) / ((details.duration || 1) / 1000))}/s`} icon={Activity} />
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card variant="elevated" padding="lg">
                  <CardHeader title="Time Information" icon={<Calendar className="w-5 h-5" />} />
                  <CardContent className="space-y-2">
                    <DetailRow label="Started" value={formatRelativeTime(details.startedAt)} />
                    <DetailRow label="Completed" value={details.completedAt ? formatRelativeTime(details.completedAt) : '—'} />
                    <DetailRow label="Duration" value={details.duration ? formatDuration(details.duration) : '—'} />
                    <DetailRow label="Backup Type" value={details.backupType.replace('_', ' ')} />
                  </CardContent>
                </Card>

                <Card variant="elevated" padding="lg">
                  <CardHeader title="Destination" icon={<HardDrive className="w-5 h-5" />} />
                  <CardContent className="space-y-2">
                    <DetailRow label="Location" value={details.settingsSnapshot?.destination?.location} />
                    <DetailRow label="Path" value={details.settingsSnapshot?.destination?.path} />
                    <DetailRow label="Structure" value={details.settingsSnapshot?.destination?.folderStructure} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              <Card variant="elevated" padding="lg">
                <CardHeader title="Backup Timeline" icon={<Activity className="w-5 h-5" />} />
                <CardContent>
                  <Timeline events={details.timeline || []} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="folders">
              <Card variant="elevated" padding="lg">
                <CardHeader title="Folder Breakdown" subtitle={`${details.folderBreakdown?.length || 0} folders processed`} icon={<FolderArchive className="w-5 h-5" />} />
                <CardContent>
                  <FolderTree folders={details.folderBreakdown || []} expandedFolders={expandedFolders} onToggle={setExpandedFolders} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="errors">
              <Card variant="elevated" padding="lg">
                <CardHeader title="Error Breakdown" subtitle={`${details.errorBreakdown?.length || 0} error types`} icon={<AlertCircle className="w-5 h-5" />} />
                <CardContent>
                  {details.errorBreakdown?.length > 0 ? (
                    <div className="space-y-3">
                      {details.errorBreakdown.map((error: ErrorBreakdown, i: number) => (
                        <ErrorRow key={i} error={error} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                      <p>No errors recorded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs">
              <Card variant="elevated" padding="lg">
                <CardHeader
                  title="Backup Logs"
                  action={
                    <div className="flex items-center gap-2">
                      <Select value={logFilter} onValueChange={(v) => setLogFilter(v as typeof logFilter)} className="w-32">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warn">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" leftIcon={<Download className="w-4 h-4" />}>Download</Button>
                    </div>
                  }
                />
                <CardContent className="p-0">
                  <LogViewer logs={details.logs || []} filter={logFilter} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card variant="elevated" padding="lg">
                  <CardHeader title="Performance Metrics" icon={<BarChart3 className="w-5 h-5" />} />
                  <CardContent className="space-y-3">
                    {details.performance && (
                      <>
                        <MetricRow label="Avg Download Speed" value={`${formatBytes(details.performance.avgDownloadSpeed || 0)}/s`} />
                        <MetricRow label="Avg Upload Speed" value={`${formatBytes(details.performance.avgUploadSpeed || 0)}/s`} />
                        <MetricRow label="Peak Memory" value={formatBytes(details.performance.peakMemoryUsage || 0)} />
                        <MetricRow label="Peak CPU" value={`${(details.performance.peakCpuUsage || 0).toFixed(1)}%`} />
                        <MetricRow label="Network Latency" value={`${details.performance.networkLatency || 0}ms`} />
                        <MetricRow label="API Calls" value={details.performance.apiCalls?.toLocaleString() || '—'} />
                        <MetricRow label="Total Errors" value={details.performance.errors?.toLocaleString() || '—'} />
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card variant="elevated" padding="lg">
                  <CardHeader title="Settings Snapshot" icon={<Settings className="w-5 h-5" />} />
                  <CardContent>
                    <SettingsSummary settings={details.settingsSnapshot} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card variant="elevated" padding="lg">
            <CardHeader title="Quick Actions" />
            <CardContent className="space-y-3">
              <Button variant="brand" className="w-full" leftIcon={<Download className="w-4 h-4" />}>Download Report</Button>
              <Button variant="secondary" className="w-full" leftIcon={<Download className="w-4 h-4" />}>Download Logs</Button>
              <Button variant="outline" className="w-full" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={handleRetry}>Retry Backup</Button>
              <Button variant="destructive" className="w-full" leftIcon={<Trash2 className="w-4 h-4" />} onClick={handleDelete}>Delete History</Button>
            </CardContent>
          </Card>

          <Card variant="elevated" padding="lg">
            <CardHeader title="Backup Details" />
            <CardContent className="space-y-3">
              <DetailRow label="Job ID" value={details.id} monospace />
              <DetailRow label="Schedule ID" value={details.scheduleId || '—'} monospace />
              <DetailRow label="Tags" value={details.tags?.join(', ') || '—'} />
              <DetailRow label="Created" value={formatRelativeTime(details.startedAt)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

BackupDetails.displayName = 'BackupDetails';

export default BackupDetails;

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card variant="elevated" padding="lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-brand-400" />
        </div>
      </div>
    </Card>
  );
}

function DetailRow({ label, value, monospace = false }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="flex justify-between py-1 border-b border-white/5 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={cn('text-sm font-medium text-white truncate max-w-[60%] text-right', monospace && 'font-mono')}>{value}</span>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-mono font-medium text-white">{value}</span>
    </div>
  );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative pl-6 border-l border-white/10">
      {events.map((event, index) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="relative pb-6 last:pb-0"
        >
          <div className="absolute left-[-22px] top-0 w-4 h-4 rounded-full border-2 border-white/10 bg-surface-900 z-10" style={{
            backgroundColor: event.status === 'completed' ? '#10b981' :
              event.status === 'failed' ? '#ef4444' :
                event.status === 'started' ? '#3b82f6' : '#6b7280',
            borderColor: event.status === 'completed' ? '#10b981' :
              event.status === 'failed' ? '#ef4444' :
                event.status === 'started' ? '#3b82f6' : '#6b7280',
          }} />
          <div className="ml-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
              <span className={cn('px-2 py-0.5 text-xs rounded-full',
                event.status === 'completed' && 'bg-emerald-500/20 text-emerald-400',
                event.status === 'failed' && 'bg-red-500/20 text-red-400',
                event.status === 'started' && 'bg-brand-500/20 text-brand-400',
                event.status === 'skipped' && 'bg-slate-500/20 text-slate-400'
              )}>
                {event.status}
              </span>
            </div>
            <p className="text-sm text-white mt-1">{event.message}</p>
            {event.duration && (
              <p className="text-xs text-slate-500 mt-1">Duration: {formatDuration(event.duration)}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function FolderTree({ folders, expandedFolders, onToggle }: { folders: FolderBreakdown[]; expandedFolders: Set<string>; onToggle: (folders: Set<string>) => void }) {
  const toggle = (id: string) => {
    const next = new Set(expandedFolders);
    next.has(id) ? next.delete(id) : next.add(id);
    onToggle(next);
  };

  const renderFolder = (folder: FolderBreakdown, depth = 0) => (
    <motion.div key={folder.folderId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={depth > 0 ? 'ml-6 border-l border-white/10 pl-4' : ''}>
      <div className="flex items-center gap-2 py-1">
        {folder.folderId && (
          <button onClick={() => toggle(folder.folderId)} className="p-1 text-slate-400 hover:text-white">
            <ChevronRight className={cn('w-4 h-4 transition-transform', expandedFolders.has(folder.folderId) && 'rotate-90')} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white truncate">{folder.folderName}</p>
          <p className="text-xs text-slate-500">
            {folder.emails?.toLocaleString()} emails · {folder.size ? formatBytes(folder.size) : '—'} · {folder.duration ? formatDuration(folder.duration) : '—'}
          </p>
        </div>
        <StatusBadge status={folder.status as any} size="sm" showDot={false} />
      </div>
      {folder.folderId && expandedFolders.has(folder.folderId) && 'children' in folder && (folder as any).children?.map((child: any) => renderFolder(child, depth + 1))}
    </motion.div>
  );

  return <div>{folders.map(renderFolder)}</div>;
}

function ErrorRow({ error }: { error: ErrorBreakdown }) {
  return (
    <motion.div className="p-4 bg-white/5 rounded-xl border border-white/10" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-red-400">{error.code}</span>
            <span className="text-sm text-slate-300">{error.message}</span>
            <Badge variant={error.recoverable ? 'success' : 'error'} size="sm">
              {error.recoverable ? 'Recoverable' : 'Fatal'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Count: {error.count}</span>
            <span>First: {formatRelativeTime(error.firstOccurrence)}</span>
            <span>Last: {formatRelativeTime(error.lastOccurrence)}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm">View Samples</Button>
      </div>
    </motion.div>
  );
}

function LogViewer({ logs, filter }: { logs: LogEntry[]; filter: 'all' | 'info' | 'warn' | 'error' }) {
  const filteredLogs = logs.filter(log => filter === 'all' || log.level === filter);

  return (
    <div className="h-96 overflow-y-auto font-mono text-sm p-4 bg-black/30 rounded-xl">
      {filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-slate-500">No logs found</div>
      ) : (
        filteredLogs.map((log, index) => (
          <motion.div
            key={index}
            className={cn('py-0.5 border-b border-white/5 last:border-0 flex items-start gap-3',
              log.level === 'error' && 'text-red-400',
              log.level === 'warn' && 'text-amber-400',
              log.level === 'debug' && 'text-slate-500',
              log.level === 'info' && 'text-slate-300',
              log.level === 'critical' && 'text-red-500 font-bold'
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-slate-500 shrink-0 w-8">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className={cn('px-1.5 py-0.5 text-[10px] rounded shrink-0',
              log.level === 'error' && 'bg-red-500/20 text-red-400',
              log.level === 'warn' && 'bg-amber-500/20 text-amber-400',
              log.level === 'info' && 'bg-blue-500/20 text-blue-400',
              log.level === 'debug' && 'bg-slate-500/20 text-slate-400',
              log.level === 'critical' && 'bg-red-500/30 text-red-300'
            )}>{log.level.toUpperCase()}</span>
            <span className="text-slate-500 shrink-0 w-20">[{log.stage}]</span>
            <span className="flex-1">{log.message}</span>
          </motion.div>
        ))
      )}
    </div>
  );
}

function SettingsSummary({ settings }: { settings: any }) {
  if (!settings) return <div className="text-slate-500 text-center py-8">No settings available</div>;

  return (
    <div className="space-y-3 text-sm">
      <SettingGroup title="Backup Type" items={[{ label: 'Type', value: settings.backupType || '—' }]} />
      <SettingGroup title="Compression" items={[
        { label: 'Enabled', value: settings.compression?.enabled ? 'Yes' : 'No' },
        { label: 'Algorithm', value: settings.compression?.algorithm || '—' },
        { label: 'Level', value: settings.compression?.level?.toString() || '—' },
      ]} />
      <SettingGroup title="Encryption" items={[
        { label: 'Enabled', value: settings.encryption?.enabled ? 'Yes' : 'No' },
        { label: 'Algorithm', value: settings.encryption?.algorithm || '—' },
      ]} />
      <SettingGroup title="Retention" items={[
        { label: 'Enabled', value: settings.retention?.enabled ? 'Yes' : 'No' },
        { label: 'Keep Last', value: settings.retention?.keepLast?.toString() || '—' },
        { label: 'Keep Days', value: settings.retention?.keepDays?.toString() || '—' },
      ]} />
    </div>
  );
}

function SettingGroup({ title, items }: { title: string; items: Array<{ label: string; value: string }> }) {
  return (
    <div className="p-3 bg-white/5 rounded-lg">
      <p className="font-medium text-white mb-2">{title}</p>
      <div className="space-y-1">
        {items.map(item => (
          <div key={item.label} className="flex justify-between text-xs">
            <span className="text-slate-400">{item.label}</span>
            <span className="font-mono text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}