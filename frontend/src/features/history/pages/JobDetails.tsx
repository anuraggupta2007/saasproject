import { memo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, RefreshCw, Trash2, Copy, FileArchive,
  Database, Clock, CheckCircle, XCircle, Loader2, FileText,
  AlertCircle, Shield
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Badge } from '@/features/backup/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/features/backup/components/ui/Tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/features/backup/components/ui/Select';
import { JobTimeline } from '../components/ui/JobTimeline';
import { DownloadCard } from '../components/ui/DownloadCard';
import { cn } from '@/utils/cn';
import {
  useJobDetails,
  useDeleteJob,
  useRetryJob,
  useDuplicateJob,
  useDownloadJobLogs,
  useDownloadJobReport,
  useDownloadFile,
  useDeleteDownload,
  useCopyDownloadLink,
} from '../hooks';
import { toast } from 'react-hot-toast';

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

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    completed_with_errors: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    failed: 'bg-red-500/15 text-red-400 border-red-500/30',
    cancelled: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    running: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    pending: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };
  return colors[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
}

function getJobTypeColor(type: string): string {
  const colors: Record<string, string> = {
    backup: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    conversion: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    scheduled: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };
  return colors[type] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
}

function getLogLevelColor(level: string): string {
  const colors: Record<string, string> = {
    debug: 'text-slate-500',
    info: 'text-blue-400',
    warn: 'text-amber-400',
    error: 'text-red-400',
    critical: 'text-red-500 font-bold',
  };
  return colors[level] || 'text-slate-400';
}

export const JobDetails = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [logFilter, setLogFilter] = useState<string>('');

  const { data: job, isLoading } = useJobDetails(id || '');
  const deleteJob = useDeleteJob();
  const retryJob = useRetryJob();
  const duplicateJob = useDuplicateJob();
  const downloadLogs = useDownloadJobLogs(id || '');
  const downloadReport = useDownloadJobReport(id || '');
  const downloadFile = useDownloadFile();
  const deleteDownload = useDeleteDownload();
  const copyLink = useCopyDownloadLink();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Job not found</p>
        </div>
      </div>
    );
  }

  const filteredLogs = logFilter
    ? job.logs.filter((l) => l.level === logFilter)
    : job.logs;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{job.name}</h1>
              <span className={cn('px-2.5 py-0.5 text-xs font-medium rounded-full border', getStatusColor(job.status))}>
                {job.status.replace('_', ' ')}
              </span>
              <span className={cn('px-2.5 py-0.5 text-xs font-medium rounded-full border', getJobTypeColor(job.jobType))}>
                {job.jobType}
              </span>
            </div>
            <p className="text-slate-400 mt-1">{job.jobId}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {job.status === 'failed' && (
            <Button variant="brand" size="sm" onClick={() => retryJob.mutate(job.id, { onSuccess: () => toast.success('Retrying') })} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Retry
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => duplicateJob.mutate(job.id, { onSuccess: () => toast.success('Duplicated') })} leftIcon={<Copy className="w-4 h-4" />}>
            Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadReport.mutate()} leftIcon={<FileText className="w-4 h-4" />}>
            Report
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadLogs.mutate()} leftIcon={<Download className="w-4 h-4" />}>
            Logs
          </Button>
          <Button variant="destructive" size="sm" onClick={() => {
            if (confirm('Delete this job?')) {
              deleteJob.mutate(job.id, { onSuccess: () => { toast.success('Deleted'); navigate(-1); } });
            }
          }} leftIcon={<Trash2 className="w-4 h-4" />}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card variant="elevated" padding="md">
          <p className="text-sm text-slate-400">Duration</p>
          <p className="text-lg font-bold text-white mt-1">{job.duration ? formatDuration(job.duration) : '—'}</p>
        </Card>
        <Card variant="elevated" padding="md">
          <p className="text-sm text-slate-400">Emails</p>
          <p className="text-lg font-bold text-white mt-1">{job.emailCount?.toLocaleString() || '0'}</p>
        </Card>
        <Card variant="elevated" padding="md">
          <p className="text-sm text-slate-400">Total Size</p>
          <p className="text-lg font-bold text-white mt-1">{formatBytes(job.totalSize)}</p>
        </Card>
        <Card variant="elevated" padding="md">
          <p className="text-sm text-slate-400">Errors</p>
          <p className={cn('text-lg font-bold mt-1', job.stats.errors > 0 ? 'text-red-400' : 'text-white')}>
            {job.stats.errors}
          </p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="downloads">Downloads</TabsTrigger>
          {job.errorBreakdown && job.errorBreakdown.length > 0 && (
            <TabsTrigger value="errors">Errors ({job.errorBreakdown.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card variant="elevated" padding="lg">
              <CardHeader title="Job Information" />
              <CardContent className="space-y-3">
                {job.accountEmail && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Account</span>
                    <span className="text-white">{job.accountEmail}</span>
                  </div>
                )}
                {job.provider && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Provider</span>
                    <span className="text-white capitalize">{job.provider}</span>
                  </div>
                )}
                {job.inputFormat && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Input Format</span>
                    <span className="text-white uppercase">{job.inputFormat}</span>
                  </div>
                )}
                {job.outputFormats && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Output Formats</span>
                    <span className="text-white uppercase">{job.outputFormats.join(', ')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Started</span>
                  <span className="text-white">{new Date(job.startedAt).toLocaleString()}</span>
                </div>
                {job.completedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Completed</span>
                    <span className="text-white">{new Date(job.completedAt).toLocaleString()}</span>
                  </div>
                )}
                {job.tags && job.tags.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Tags</span>
                    <div className="flex gap-1">
                      {job.tags.map((tag) => (
                        <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardHeader title="Statistics" />
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Emails</span>
                  <span className="text-white">{job.stats.totalEmails.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Size</span>
                  <span className="text-white">{formatBytes(job.stats.totalSize)}</span>
                </div>
                {job.stats.totalAttachments && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Attachments</span>
                    <span className="text-white">{job.stats.totalAttachments.toLocaleString()}</span>
                  </div>
                )}
                {job.stats.foldersProcessed && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Folders</span>
                    <span className="text-white">{job.stats.foldersProcessed}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Errors</span>
                  <span className={job.stats.errors > 0 ? 'text-red-400' : 'text-white'}>{job.stats.errors}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Warnings</span>
                  <span className={job.stats.warnings > 0 ? 'text-amber-400' : 'text-white'}>{job.stats.warnings}</span>
                </div>
                {job.stats.duplicatesSkipped && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Duplicates Skipped</span>
                    <span className="text-white">{job.stats.duplicatesSkipped}</span>
                  </div>
                )}
                {job.stats.avgSpeed && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Avg Speed</span>
                    <span className="text-white">{formatBytes(job.stats.avgSpeed)}/s</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {job.folderBreakdown && job.folderBreakdown.length > 0 && (
              <Card variant="elevated" padding="lg" className="lg:col-span-2">
                <CardHeader title="Folder Breakdown" />
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="px-3 py-2 text-left text-xs text-slate-400 font-medium">Folder</th>
                          <th className="px-3 py-2 text-right text-xs text-slate-400 font-medium">Emails</th>
                          <th className="px-3 py-2 text-right text-xs text-slate-400 font-medium">Size</th>
                          <th className="px-3 py-2 text-right text-xs text-slate-400 font-medium">Duration</th>
                          <th className="px-3 py-2 text-right text-xs text-slate-400 font-medium">Errors</th>
                          <th className="px-3 py-2 text-center text-xs text-slate-400 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {job.folderBreakdown.map((folder) => (
                          <tr key={folder.folderId} className="hover:bg-white/5">
                            <td className="px-3 py-2 text-white">{folder.folderName}</td>
                            <td className="px-3 py-2 text-right text-slate-300">{folder.emails.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-slate-300">{formatBytes(folder.size)}</td>
                            <td className="px-3 py-2 text-right text-slate-300">{formatDuration(folder.duration)}</td>
                            <td className={cn('px-3 py-2 text-right', folder.error ? 'text-red-400' : 'text-slate-300')}>{folder.error ?? '—'}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={cn('px-2 py-0.5 text-xs rounded-full border', getStatusColor(folder.status))}>
                                {folder.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card variant="elevated" padding="lg">
            <CardHeader title="Job Timeline" />
            <CardContent>
              {job.timeline.length > 0 ? (
                <JobTimeline events={job.timeline} />
              ) : (
                <p className="text-slate-500 text-center py-8">No timeline events</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card variant="elevated" padding="lg">
            <CardHeader
              title="Job Logs"
              subtitle={`${filteredLogs.length} entries`}
              action={
                <div className="flex items-center gap-2">
                  <Select value={logFilter} onValueChange={setLogFilter}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="All Levels" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Levels</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => downloadLogs.mutate()} leftIcon={<Download className="w-4 h-4" />}>
                    Download
                  </Button>
                </div>
              }
            />
            <CardContent>
              <div className="max-h-[500px] overflow-y-auto space-y-1 font-mono text-xs">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 py-1 hover:bg-white/5 px-2 rounded">
                      <span className="text-slate-500 w-36 flex-shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
                      <span className={cn('w-16 flex-shrink-0 uppercase', getLogLevelColor(log.level))}>{log.level}</span>
                      <span className="text-slate-400 w-20 flex-shrink-0">[{log.stage}]</span>
                      <span className="text-white">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-8">No logs</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="downloads">
          <Card variant="elevated" padding="lg">
            <CardHeader title="Downloadable Files" />
            <CardContent className="space-y-3">
              {job.convertedFiles && job.convertedFiles.length > 0 ? (
                job.convertedFiles.map((file) => (
                  <DownloadCard
                    key={file.id}
                    item={{
                      id: file.id,
                      jobId: job.id,
                      jobName: job.name,
                      jobType: job.jobType,
                      fileName: file.name,
                      fileType: file.format,
                      format: file.format,
                      size: file.size,
                      downloadUrl: file.downloadUrl,
                      generatedAt: job.completedAt || job.createdAt,
                      expiresAt: file.expiresAt,
                      downloadCount: file.downloadCount,
                      status: 'available',
                      integrity: file.verified ? 'verified' : undefined,
                    }}
                    onDownload={(fid) => downloadFile.mutate(fid, { onSuccess: () => toast.success('Download started') })}
                    onDelete={(fid) => deleteDownload.mutate(fid, { onSuccess: () => toast.success('Deleted') })}
                    onCopyLink={(fid) => copyLink.mutate(fid, { onSuccess: () => toast.success('Link copied') })}
                  />
                ))
              ) : (
                <p className="text-slate-500 text-center py-8">No files available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {job.errorBreakdown && job.errorBreakdown.length > 0 && (
          <TabsContent value="errors">
            <Card variant="elevated" padding="lg">
              <CardHeader title="Error Breakdown" />
              <CardContent className="space-y-3">
                {job.errorBreakdown.map((error, i) => (
                  <div key={i} className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="font-mono text-xs text-red-400">{error.code}</span>
                      <Badge variant={error.recoverable ? 'info' : 'error'} size="sm">
                        {error.recoverable ? 'Recoverable' : 'Critical'}
                      </Badge>
                    </div>
                    <p className="text-sm text-white">{error.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Occurred {error.count}x ({error.firstOccurrence} — {error.lastOccurrence})
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
});

JobDetails.displayName = 'JobDetails';

export default JobDetails;
