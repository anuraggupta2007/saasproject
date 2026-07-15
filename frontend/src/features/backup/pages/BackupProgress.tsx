import { memo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Pause, Play, X, CheckCircle, AlertCircle, Loader2, Database, Download,
  FolderArchive, Mail, Clock, Zap, Activity, ArrowLeft, RefreshCw, Shield, Filter
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge, Progress } from '../components/ui/Badge';
import { useJob, useJobProgress, useJobLogs, useStartJob, usePauseJob, useResumeJob, useCancelJob, useRetryJob, useDownloadJobLog, useDownloadJobReport } from '../hooks';
import { cn } from '@/utils/cn';
import { formatBytes, formatRelativeTime } from '@/utils/format';
import { toast } from 'react-hot-toast';
import type { JobStage } from '../types';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

const stageOrder: JobStage[] = [
  'initializing',
  'connecting',
  'authenticating',
  'listing_folders',
  'analyzing',
  'downloading',
  'processing',
  'compressing',
  'encrypting',
  'uploading',
  'verifying',
  'finalizing',
];

const stageLabels: Record<JobStage, string> = {
  initializing: 'Initializing',
  connecting: 'Connecting',
  authenticating: 'Authenticating',
  listing_folders: 'Listing Folders',
  analyzing: 'Analyzing',
  downloading: 'Downloading',
  processing: 'Processing',
  compressing: 'Compressing',
  encrypting: 'Encrypting',
  uploading: 'Uploading',
  verifying: 'Verifying',
  finalizing: 'Finalizing',
  selecting_folders: 'Selecting Folders',
  applying_filters: 'Applying Filters',
  fetching_messages: 'Fetching Messages',
  downloading_attachments: 'Downloading Attachments',
  completed: 'Completed',
};

const stageIcons: Record<JobStage, React.ComponentType<{ className?: string }>> = {
  initializing: Loader2,
  connecting: Database,
  authenticating: Shield,
  listing_folders: FolderArchive,
  analyzing: Activity,
  downloading: Download,
  processing: Mail,
  compressing: Database,
  encrypting: Shield,
  uploading: Zap,
  verifying: CheckCircle,
  finalizing: CheckCircle,
  selecting_folders: FolderArchive,
  applying_filters: Filter,
  fetching_messages: Download,
  downloading_attachments: Download,
  completed: CheckCircle,
};

export const BackupProgress = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<string[]>([]);
  const [logLevel, setLogLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  const { data: job, isLoading, error } = useJob(id!);
  const { data: progress } = useJobProgress(id!);
  const { data: logsData } = useJobLogs(id!);
  const startJob = useStartJob();
  const pauseJob = usePauseJob();
  const resumeJob = useResumeJob();
  const cancelJob = useCancelJob();
  const retryJob = useRetryJob();
  const downloadLog = useDownloadJobLog(id!);
  const downloadReport = useDownloadJobReport(id!);

  const iconPlay = <Play className="w-4 h-4" />;
  const iconPause = <Pause className="w-4 h-4" />;
  const iconX = <X className="w-4 h-4" />;
  const iconDownload = <Download className="w-4 h-4" />;
  const iconRefresh = <RefreshCw className="w-4 h-4" />;
  const iconArrowLeft = <ArrowLeft className="w-4 h-4" />;

  useEffect(() => {
    if (logsData?.logs) {
      setLogs(prev => [...prev, ...logsData.logs]);
    }
  }, [logsData]);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleStart = () => startJob.mutate(id!);
  const handlePause = () => pauseJob.mutate(id!);
  const handleResume = () => resumeJob.mutate(id!);
  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this backup?')) {
      cancelJob.mutate(id!, {
        onSuccess: () => toast.success('Backup cancelled'),
        onError: () => toast.error('Failed to cancel backup'),
      });
    }
  };
  const handleRetry = () => retryJob.mutate(id!);
  const handleDownloadLog = () => downloadLog.mutate();
  const handleDownloadReport = () => downloadReport.mutate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white">Backup Job Not Found</h2>
        <Button variant="brand" onClick={() => navigate('/dashboard/backup')} className="mt-4">
          Back to Backup Jobs
        </Button>
      </div>
    );
  }

  const currentStage = progress?.currentStage || 'initializing';
  const currentStageIndex = stageOrder.indexOf(currentStage);
  const completedStages = stageOrder.slice(0, currentStageIndex);
  const pendingStages = stageOrder.slice(currentStageIndex + 1);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{job.name}</h1>
          <p className="text-slate-400">{job.accountId}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={job.status} size="lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card variant="elevated" padding="lg">
            <CardHeader
              title="Overall Progress"
              subtitle={job.status === 'running' ? 'Phase: ' + stageLabels[currentStage] : job.status}
            />
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Progress</span>
                  <span className="font-mono font-medium text-white">{progress?.percentage != null ? progress.percentage.toFixed(1) : '0'}%</span>
                </div>
                <Progress
                  value={progress?.percentage || 0}
                  size="lg"
                  variant={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'error' : 'brand'}
                  animated={job.status === 'running'}
                  striped={job.status === 'running'}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Emails Processed" value={(progress?.processedEmails || 0).toLocaleString()} total={progress?.totalEmails?.toString()} />
                <StatCard label="Data Processed" value={formatBytes(progress?.bytesProcessed || 0)} total={progress?.totalBytes ? formatBytes(progress.totalBytes) : undefined} />
                <StatCard label="Download Speed" value={formatBytes(progress?.downloadSpeed || 0) + '/s'} />
                <StatCard label="Elapsed Time" value={formatDuration(progress?.elapsedTime || 0)} />
              </div>

              {progress?.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
                <StatCard label="Estimated Remaining" value={formatDuration(progress.estimatedTimeRemaining)} />
              )}

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 text-sm mb-3">
                  <span className="text-slate-400">Current Folder:</span>
                  <span className="font-medium text-white truncate flex-1">{progress?.currentFolder || '\u2014'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-400">Folders:</span>
                  <span className="font-mono text-white">{progress?.processedFolders || 0} / {progress?.totalFolders || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" padding="lg">
            <CardHeader
              title="Stage Progress"
              action={<StatusBadge status={job.status} size="sm" showDot />}
            />
            <CardContent>
              <div className="space-y-3">
                {stageOrder.map((stage, index) => {
                  const isCompleted = completedStages.includes(stage);
                  const isCurrent = stage === currentStage;
                  const isPending = pendingStages.includes(stage);
                  const PhaseIcon = stageIcons[stage];

                  return (
                    <motion.div
                      key={stage}
                      className={cn('flex items-center gap-4', isCurrent && 'relative')}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <motion.div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                          isCompleted ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' :
                          isCurrent ? 'bg-brand-500/20 border border-brand-500/30 text-brand-400 ring-2 ring-brand-500/20' :
                          'bg-white/5 border border-white/10 text-white/50'
                        )}
                        whileHover={{ scale: 1.1 }}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : isCurrent ? (
                          <motion.div
                            className="w-5 h-5"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <PhaseIcon className="w-5 h-5" />
                          </motion.div>
                        ) : (
                          <PhaseIcon className="w-5 h-5" />
                        )}
                      </motion.div>
                      <div className="flex-1">
                        <p className={cn('font-medium', isCompleted ? 'text-white' : isCurrent ? 'text-brand-400' : 'text-slate-400')}>
                          {stageLabels[stage]}
                        </p>
                        {isCurrent && progress?.stageProgress?.[stage] !== undefined && (
                          <Progress
                            value={progress.stageProgress[stage]}
                            size="sm"
                            variant={isCurrent ? 'brand' : 'default'}
                            showLabel
                          />
                        )}
                      </div>
                      {isCompleted && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" padding="lg">
            <CardHeader
              title="Live Logs"
              action={
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 p-0.5 bg-white/5 rounded-lg">
                    {(['all', 'info', 'warn', 'error'] as const).map(level => (
                      <button
                        key={level}
                        onClick={() => setLogLevel(level)}
                        className={cn('px-2 py-1 text-xs font-medium rounded-md transition-colors', logLevel === level ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-white')}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="sr-only" />
                    <span className="text-slate-400">Auto-scroll</span>
                  </label>
                  <Button variant="ghost" size="sm" onClick={handleDownloadLog} leftIcon={iconDownload}>Download</Button>
                </div>
              }
            />
            <CardContent className="p-0">
              <div className="h-96 overflow-y-auto font-mono text-sm p-4 bg-black/30 rounded-xl" role="log" aria-live="polite">
                {logs.map((log, index) => (
                  <motion.div
                    key={index}
                    className={cn('py-0.5 border-b border-white/5 last:border-0', log.includes('ERROR') ? 'text-red-400' : log.includes('WARN') ? 'text-amber-400' : 'text-slate-300')}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {log}
                  </motion.div>
                ))}
                <div ref={logEndRef} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card variant="elevated" padding="lg">
            <CardHeader title="Statistics" />
            <CardContent className="space-y-4">
              <StatRow label="Total Emails" value={job.stats?.totalEmails?.toLocaleString() || '\u2014'} />
              <StatRow label="Total Size" value={job.stats?.totalSize ? formatBytes(job.stats.totalSize) : '\u2014'} />
              <StatRow label="Attachments" value={job.stats?.totalAttachments?.toLocaleString() || '\u2014'} />
              <StatRow label="Attachments Size" value={job.stats?.totalAttachmentsSize ? formatBytes(job.stats.totalAttachmentsSize) : '\u2014'} />
              <StatRow label="Folders Processed" value={job.stats?.foldersProcessed?.toLocaleString() || '\u2014'} />
              <StatRow label="Duplicates Skipped" value={job.stats?.duplicatesSkipped?.toLocaleString() || '\u2014'} />
              <StatRow label="Errors" value={job.stats?.errors?.toLocaleString() || '\u2014'} />
              <StatRow label="Warnings" value={job.stats?.warnings?.toLocaleString() || '\u2014'} />
            </CardContent>
          </Card>

          <Card variant="elevated" padding="lg">
            <CardHeader title="Actions" />
            <CardContent className="space-y-3">
              {job.status === 'pending' || job.status === 'queued' ? (
                <Button variant="brand" className="w-full" size="lg" onClick={handleStart} leftIcon={iconPlay} loading={startJob.isPending}>
                  Start Backup
                </Button>
              ) : job.status === 'running' ? (
                <>
                  <Button variant="destructive" className="w-full" size="lg" onClick={handlePause} leftIcon={iconPause} loading={pauseJob.isPending}>
                    Pause
                  </Button>
                  <Button variant="destructive" className="w-full" size="lg" onClick={handleCancel} leftIcon={iconX} loading={cancelJob.isPending}>
                    Cancel
                  </Button>
                </>
              ) : job.status === 'paused' ? (
                <>
                  <Button variant="brand" className="w-full" size="lg" onClick={handleResume} leftIcon={iconPlay} loading={resumeJob.isPending}>
                    Resume
                  </Button>
                  <Button variant="destructive" className="w-full" onClick={handleCancel} leftIcon={iconX} loading={cancelJob.isPending}>
                    Cancel
                  </Button>
                </>
              ) : job.status === 'completed' ? (
                <>
                  <Button variant="brand" className="w-full" onClick={handleDownloadReport} leftIcon={iconDownload} loading={downloadReport.isPending}>
                    Download Report
                  </Button>
                  <Button variant="secondary" className="w-full" onClick={handleDownloadLog} leftIcon={iconDownload} loading={downloadLog.isPending}>
                    Download Log
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={handleRetry} leftIcon={iconRefresh} loading={retryJob.isPending}>
                    Run Again
                  </Button>
                </>
              ) : job.status === 'failed' ? (
                <>
                  <Button variant="destructive" className="w-full" size="lg" onClick={handleRetry} leftIcon={iconRefresh} loading={retryJob.isPending}>
                    Retry
                  </Button>
                  <Button variant="secondary" className="w-full" onClick={handleDownloadLog} leftIcon={iconDownload} loading={downloadLog.isPending}>
                    Download Log
                  </Button>
                </>
              ) : null}

              {job.status === 'failed' ? null : (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-slate-500 text-center">
                    Created {formatRelativeTime(job.createdAt)} &middot; {job.scheduleId ? 'Scheduled' : 'Manual'} backup
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {job.error && (
            <Card variant="outlined" padding="lg" className="border-red-500/30 bg-red-500/5">
              <CardHeader title="Error Details" icon={<AlertCircle className="w-5 h-5 text-red-400" />} />
              <CardContent className="space-y-3">
                <div className="p-3 bg-black/30 rounded-lg font-mono text-sm text-red-300">
                  {job.error.message}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div><span className="text-white">Code:</span> {job.error.code}</div>
                  <div><span className="text-white">Phase:</span> {job.error.stage || '—'}</div>
                  <div><span className="text-white">Recoverable:</span> {job.error.recoverable ? 'Yes' : 'No'}</div>
                </div>
                {job.error.recoverable && (
                  <Button variant="destructive" className="w-full" onClick={handleRetry} leftIcon={iconRefresh} loading={retryJob.isPending}>
                    Retry Backup
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
});

BackupProgress.displayName = 'BackupProgress';

export default BackupProgress;

function StatCard({ label, value, total }: { label: string; value: string; total?: string }) {
  return (
    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-mono font-semibold text-white mt-1">{value}</p>
      {total && <p className="text-xs text-slate-500 mt-1">of {total}</p>}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono font-medium text-white">{value}</span>
    </div>
  );
}
