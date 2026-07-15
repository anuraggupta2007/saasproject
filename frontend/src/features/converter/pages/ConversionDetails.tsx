import { memo, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Trash2, RefreshCw, Calendar, Clock, Database,
  Mail, CheckCircle, AlertCircle, XCircle, Loader2, Settings, FileText
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Badge } from '@/features/backup/components/ui/Badge';
import { Progress } from '@/features/backup/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/features/backup/components/ui/Tabs';
import { StatusBadge } from '@/features/backup/components/ui/Badge';
import { LogViewer } from '../components/ui/LogViewer';
import { cn } from '@/utils/cn';
import { formatBytes, formatDuration, formatRelativeTime } from '@/utils/format';
import { toast } from 'react-hot-toast';
import { useHistoryDetails, useDeleteHistoryItem, useDownloadAllConverted, useDownloadList } from '../hooks';
import type { ConversionHistoryDetails, ConversionLogEntry, ConversionTimelineEvent, ConvertedFile } from '../types';

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: 'success',
    completed_with_errors: 'warning',
    failed: 'error',
    cancelled: 'neutral',
    running: 'info',
    converting: 'info',
    paused: 'warning',
    pending: 'neutral',
  };
  return colors[status] || 'neutral';
}

export const ConversionDetails = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: details, isLoading, error } = useHistoryDetails(id!);
  const deleteMutation = useDeleteHistoryItem();
  const downloadAll = useDownloadAllConverted();
  const { data: downloads } = useDownloadList(id!);

  const errorBreakdown = useMemo(() => {
    if (!details) return [];
    const errorLogs = details.logs.filter((l) => l.level === 'error' || l.level === 'critical');
    const groups = new Map<string, { code: string; message: string; count: number; firstOccurrence: string; lastOccurrence: string; recoverable: boolean }>();
    for (const log of errorLogs) {
      const existing = groups.get(log.message);
      if (existing) {
        existing.count += 1;
        if (log.timestamp < existing.firstOccurrence) existing.firstOccurrence = log.timestamp;
        if (log.timestamp > existing.lastOccurrence) existing.lastOccurrence = log.timestamp;
      } else {
        groups.set(log.message, {
          code: log.stage,
          message: log.message,
          count: 1,
          firstOccurrence: log.timestamp,
          lastOccurrence: log.timestamp,
          recoverable: log.level !== 'critical',
        });
      }
    }
    return Array.from(groups.values());
  }, [details]);

  const handleDelete = () => {
    if (confirm('Delete this conversion history entry?')) {
      deleteMutation.mutate(id!, {
        onSuccess: () => {
          toast.success('History deleted');
          navigate('/dashboard/convert/history');
        },
        onError: () => toast.error('Failed to delete'),
      });
    }
  };

  const handleDownloadAll = () => {
    downloadAll.mutate(id!, {
      onSuccess: () => toast.success('Download started'),
      onError: () => toast.error('Download failed'),
    });
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
        <h2 className="text-xl font-semibold text-white">Conversion Not Found</h2>
        <Button variant="brand" onClick={() => navigate('/dashboard/convert/history')} className="mt-4">
          Back to History
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/convert/history')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{details.name}</h1>
            <p className="text-slate-400">{details.inputFormat.toUpperCase()} → {details.outputFormats.map(f => f.toUpperCase()).join(', ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getStatusColor(details.status) as any} size="lg">{details.status}</Badge>
          <Button variant="brand" leftIcon={<Download className="w-4 h-4" />} onClick={handleDownloadAll}>
            Download All
          </Button>
          <Button variant="destructive" leftIcon={<Trash2 className="w-4 h-4" />} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-white/5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="errors">Errors</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Emails Processed" value={details.emailCount?.toLocaleString() || '—'} icon={Mail} />
                <StatCard label="Total Size" value={formatBytes(details.totalSize)} icon={Database} />
                <StatCard label="File Count" value={details.fileCount?.toLocaleString() || '—'} icon={FileText} />
                <StatCard label="Duration" value={details.duration ? formatDuration(details.duration) : '—'} icon={Clock} />
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card variant="elevated" padding="lg">
                  <CardHeader title="Time Information" icon={<Calendar className="w-5 h-5" />} />
                  <CardContent className="space-y-2">
                    <DetailRow label="Started" value={formatRelativeTime(details.startedAt)} />
                    <DetailRow label="Completed" value={details.completedAt ? formatRelativeTime(details.completedAt) : '—'} />
                    <DetailRow label="Duration" value={details.duration ? formatDuration(details.duration) : '—'} />
                  </CardContent>
                </Card>

                <Card variant="elevated" padding="lg">
                  <CardHeader title="Destination" icon={<Settings className="w-5 h-5" />} />
                  <CardContent className="space-y-2">
                    <DetailRow label="Location" value={details.destination?.location || '—'} />
                    <DetailRow label="Path" value={details.destination?.path || '—'} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="files">
              <Card variant="elevated" padding="lg">
                <CardHeader title="Converted Files" subtitle={`${downloads?.length || 0} files available`} />
                <CardContent className="space-y-3">
                  {downloads && downloads.length > 0 ? (
                    downloads.map((file) => (
                      <div key={file.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                        <FileText className="w-5 h-5 text-brand-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{file.fileName}</p>
                          <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                        </div>
                        <Button variant="ghost" size="sm" leftIcon={<Download className="w-4 h-4" />}>
                          Download
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                      <p>No converted files available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline">
              <Card variant="elevated" padding="lg">
                <CardHeader title="Timeline" />
                <CardContent>
                  {details.timeline && details.timeline.length > 0 ? (
                    <div className="relative pl-6 border-l border-white/10">
                      {details.timeline.map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="relative pb-6 last:pb-0"
                        >
                          <div className="absolute left-[-22px] top-0 w-4 h-4 rounded-full border-2 border-white/10" style={{
                            backgroundColor: event.status === 'completed' ? '#009688' :
                              event.status === 'failed' ? '#ef4444' :
                                event.status === 'started' ? '#3b82f6' : '#6b7280',
                          }} />
                          <div className="ml-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                              <Badge variant={getStatusColor(event.status) as any} size="sm">{event.status}</Badge>
                            </div>
                            <p className="text-sm text-white mt-1">{event.message}</p>
                            {event.duration && (
                              <p className="text-xs text-slate-500 mt-1">Duration: {formatDuration(event.duration)}</p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">No timeline events</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="errors">
              <Card variant="elevated" padding="lg">
                <CardHeader title="Error Breakdown" />
                <CardContent>
                  {errorBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {errorBreakdown.map((err, i) => (
                        <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-mono text-sm text-red-400">{err.code}</p>
                              <p className="text-sm text-slate-300 mt-1">{err.message}</p>
                              <p className="text-xs text-slate-500 mt-2">
                                Count: {err.count} · First: {formatRelativeTime(err.firstOccurrence)} · Last: {formatRelativeTime(err.lastOccurrence)}
                              </p>
                            </div>
                            <Badge variant={err.recoverable ? 'success' : 'error'} size="sm">
                              {err.recoverable ? 'Recoverable' : 'Fatal'}
                            </Badge>
                          </div>
                        </div>
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
                <CardHeader title="Conversion Logs" />
                <CardContent className="p-0">
                  <LogViewer
                    logs={details.logs?.map(l => `[${l.level.toUpperCase()}] ${l.message}`) || []}
                    filter="all"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card variant="elevated" padding="lg">
                <CardHeader title="Settings" />
                <CardContent className="space-y-4">
                  {details.options && (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <h4 className="font-medium text-white mb-3">Conversion Options</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <DetailRow label="Preserve Folder Structure" value={details.options.preserveFolderStructure ? 'Yes' : 'No'} />
                        <DetailRow label="Preserve Metadata" value={details.options.preserveMetadata ? 'Yes' : 'No'} />
                        <DetailRow label="Preserve Attachments" value={details.options.preserveAttachments ? 'Yes' : 'No'} />
                        <DetailRow label="Include Headers" value={details.options.includeHeaders ? 'Yes' : 'No'} />
                        <DetailRow label="Include Deleted Items" value={details.options.includeDeletedItems ? 'Yes' : 'No'} />
                        <DetailRow label="Merge Output Files" value={details.options.mergeOutputFiles ? 'Yes' : 'No'} />
                      </div>
                    </div>
                  )}
                  {details.filters && (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <h4 className="font-medium text-white mb-3">Filters</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <DetailRow label="Date Range" value={details.filters.dateFrom && details.filters.dateTo ? `${details.filters.dateFrom} to ${details.filters.dateTo}` : 'All dates'} />
                        <DetailRow label="Sender" value={details.filters.sender || 'All'} />
                        <DetailRow label="Recipient" value={details.filters.recipient || 'All'} />
                        <DetailRow label="Read Status" value={details.filters.readStatus || 'All'} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card variant="elevated" padding="lg">
            <CardHeader title="Quick Actions" />
            <CardContent className="space-y-3">
              <Button variant="brand" className="w-full" leftIcon={<Download className="w-4 h-4" />} onClick={handleDownloadAll}>
                Download Results
              </Button>
              <Button variant="secondary" className="w-full" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => toast('Retry coming soon')}>
                Retry
              </Button>
              <Button variant="destructive" className="w-full" leftIcon={<Trash2 className="w-4 h-4" />} onClick={handleDelete}>
                Delete History
              </Button>
            </CardContent>
          </Card>

          <Card variant="elevated" padding="lg">
            <CardHeader title="Details" />
            <CardContent className="space-y-3">
              <DetailRow label="Job ID" value={details.jobId} monospace />
              <DetailRow label="Input Format" value={details.inputFormat.toUpperCase()} />
              <DetailRow label="Output Formats" value={details.outputFormats.map(f => f.toUpperCase()).join(', ')} />
              <DetailRow label="Tags" value={details.tags?.join(', ') || '—'} />
              <DetailRow label="Created" value={formatRelativeTime(details.startedAt)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

ConversionDetails.displayName = 'ConversionDetails';

export default ConversionDetails;

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
