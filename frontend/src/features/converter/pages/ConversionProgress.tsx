import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Pause, Play, X, CheckCircle, AlertCircle, Loader2, Database, Download,
  FolderArchive, Mail, Clock, Zap, Activity, ArrowLeft, RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { StatusBadge, Progress } from '@/features/backup/components/ui/Badge';
import { cn } from '@/utils/cn';
import { formatBytes } from '@/utils/format';
import { toast } from 'react-hot-toast';
import { LogViewer } from '../components/ui/LogViewer';
import { StageProgress } from '../components/ui/StageProgress';
import {
  useConverterJob, useConversionProgress, useConversionLogs,
  useStartConversion, usePauseConversion, useResumeConversion,
  useCancelConversion, useRetryConversion, useDownloadConversionLog
} from '../hooks';
import { createConversionWebSocket, parseWebSocketMessage } from '../api';
import type { ConversionStage } from '../types';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

const STAGE_LABELS: Record<ConversionStage, string> = {
  initializing: 'Initializing',
  uploading: 'Uploading',
  validating: 'Validating',
  parsing: 'Parsing',
  extracting: 'Extracting',
  converting: 'Converting',
  formatting: 'Formatting',
  compressing: 'Compressing',
  finalizing: 'Finalizing',
  completed: 'Completed',
};

export const ConversionProgress = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<string[]>([]);
  const [logLevel, setLogLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  const { data: job, isLoading, error } = useConverterJob(id!);
  const { data: progress } = useConversionProgress(id!);
  const { data: logsData } = useConversionLogs(id!);
  const startJob = useStartConversion();
  const pauseJob = usePauseConversion();
  const resumeJob = useResumeConversion();
  const cancelJob = useCancelConversion();
  const retryJob = useRetryConversion();
  const downloadLog = useDownloadConversionLog(id!);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('auth_token') || '';
    const ws = createConversionWebSocket(id, token);

    ws.onmessage = (event) => {
      const msg = parseWebSocketMessage(event);
      if (msg.type === 'progress') {
        // progress updated via query refetch
      } else if (msg.type === 'log') {
        setLogs(prev => [...prev, `[${msg.data.level.toUpperCase()}] ${msg.data.message}`]);
      } else if (msg.type === 'stage') {
        // stage updated
      }
    };

    return () => ws.close();
  }, [id]);

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
    if (confirm('Cancel this conversion?')) {
      cancelJob.mutate(id!, {
        onSuccess: () => toast.success('Conversion cancelled'),
        onError: () => toast.error('Failed to cancel'),
      });
    }
  };
  const handleRetry = () => retryJob.mutate(id!);
  const handleDownloadLog = () => downloadLog.mutate();

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
        <h2 className="text-xl font-semibold text-white">Conversion Job Not Found</h2>
        <Button variant="brand" onClick={() => navigate('/dashboard/convert')} className="mt-4">
          Back to Converter
        </Button>
      </div>
    );
  }

  const currentStage = progress?.currentStage || 'initializing';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{job.name}</h1>
          <p className="text-slate-400">{job.inputFiles?.length || 0} file(s) · {job.outputFormats?.join(', ').toUpperCase()}</p>
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
              subtitle={job.status === 'converting' ? `Stage: ${STAGE_LABELS[currentStage]}` : job.status}
            />
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Progress</span>
                  <span className="font-mono font-medium text-white">{progress?.overallPercentage?.toFixed(1) || '0'}%</span>
                </div>
                <Progress
                  value={progress?.overallPercentage || 0}
                  size="lg"
                  variant={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'error' : 'brand'}
                  animated={job.status === 'converting' || job.status === 'uploading'}
                  striped={job.status === 'converting' || job.status === 'uploading'}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Files Processed" value={`${progress?.filesProcessed || 0} / ${progress?.totalFiles || 0}`} />
                <StatCard label="Emails Processed" value={(progress?.processedEmails || 0).toLocaleString()} total={progress?.totalEmails?.toString()} />
                <StatCard label="Data Processed" value={formatBytes(progress?.bytesProcessed || 0)} total={progress?.totalBytes ? formatBytes(progress.totalBytes) : undefined} />
                <StatCard label="Elapsed Time" value={formatDuration(progress?.elapsedTime || 0)} />
              </div>

              {progress?.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
                <StatCard label="Estimated Remaining" value={formatDuration(progress.estimatedTimeRemaining)} />
              )}

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 text-sm mb-3">
                  <span className="text-slate-400">Current File:</span>
                  <span className="font-medium text-white truncate flex-1">{progress?.currentFileName || '—'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-400">Speed:</span>
                  <span className="font-mono text-white">{formatBytes(progress?.conversionSpeed || 0)}/s</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" padding="lg">
            <CardHeader title="Stage Progress" />
            <CardContent>
              <StageProgress
                currentStage={currentStage}
                completedStages={progress?.stageProgress ? Object.entries(progress.stageProgress).filter(([, v]) => v >= 100).map(([k]) => k as ConversionStage) : []}
                stageProgress={progress?.stageProgress || 0}
              />
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
                  <Button variant="ghost" size="sm" onClick={handleDownloadLog} leftIcon={<Download className="w-4 h-4" />}>Download</Button>
                </div>
              }
            />
            <CardContent className="p-0">
              <LogViewer logs={logs} filter={logLevel} autoScroll={autoScroll} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card variant="elevated" padding="lg">
            <CardHeader title="Statistics" />
            <CardContent className="space-y-4">
              <StatRow label="Total Files" value={progress?.totalFiles?.toLocaleString() || '—'} />
              <StatRow label="Converted Files" value={job.stats?.convertedFiles?.toLocaleString() || '—'} />
              <StatRow label="Failed Files" value={job.stats?.failedFiles?.toLocaleString() || '—'} />
              <StatRow label="Total Emails" value={job.stats?.totalEmails?.toLocaleString() || '—'} />
              <StatRow label="Total Size" value={job.stats?.totalSize ? formatBytes(job.stats.totalSize) : '—'} />
              <StatRow label="Converted Size" value={job.stats?.convertedSize ? formatBytes(job.stats.convertedSize) : '—'} />
              <StatRow label="Errors" value={job.stats?.errorCount?.toLocaleString() || '—'} />
              <StatRow label="Warnings" value={job.stats?.warningCount?.toLocaleString() || '—'} />
            </CardContent>
          </Card>

          <Card variant="elevated" padding="lg">
            <CardHeader title="Actions" />
            <CardContent className="space-y-3">
              {job.status === 'pending' || job.status === 'queued' ? (
                <Button variant="brand" className="w-full" size="lg" onClick={handleStart} leftIcon={<Play className="w-4 h-4" />} loading={startJob.isPending}>
                  Start Conversion
                </Button>
              ) : job.status === 'converting' || job.status === 'uploading' || job.status === 'processing' ? (
                <>
                  <Button variant="destructive" className="w-full" size="lg" onClick={handlePause} leftIcon={<Pause className="w-4 h-4" />} loading={pauseJob.isPending}>
                    Pause
                  </Button>
                  <Button variant="destructive" className="w-full" size="lg" onClick={handleCancel} leftIcon={<X className="w-4 h-4" />} loading={cancelJob.isPending}>
                    Cancel
                  </Button>
                </>
              ) : job.status === 'paused' ? (
                <>
                  <Button variant="brand" className="w-full" size="lg" onClick={handleResume} leftIcon={<Play className="w-4 h-4" />} loading={resumeJob.isPending}>
                    Resume
                  </Button>
                  <Button variant="destructive" className="w-full" onClick={handleCancel} leftIcon={<X className="w-4 h-4" />} loading={cancelJob.isPending}>
                    Cancel
                  </Button>
                </>
              ) : job.status === 'completed' || job.status === 'completed_with_errors' ? (
                <>
                  <Button variant="brand" className="w-full" onClick={() => navigate(`/dashboard/convert/downloads/${job.id}`)} leftIcon={<Download className="w-4 h-4" />}>
                    Download Results
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={handleRetry} leftIcon={<RefreshCw className="w-4 h-4" />}>
                    Run Again
                  </Button>
                </>
              ) : job.status === 'failed' ? (
                <>
                  <Button variant="destructive" className="w-full" size="lg" onClick={handleRetry} leftIcon={<RefreshCw className="w-4 h-4" />} loading={retryJob.isPending}>
                    Retry
                  </Button>
                  <Button variant="secondary" className="w-full" onClick={handleDownloadLog} leftIcon={<Download className="w-4 h-4" />}>
                    Download Log
                  </Button>
                </>
              ) : null}

              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-slate-500 text-center">
                  Created {new Date(job.createdAt).toLocaleDateString()}
                </p>
              </div>
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
                  <div><span className="text-white">Stage:</span> {job.error.stage || '—'}</div>
                  <div><span className="text-white">Recoverable:</span> {job.error.recoverable ? 'Yes' : 'No'}</div>
                </div>
                {job.error.recoverable && (
                  <Button variant="destructive" className="w-full" onClick={handleRetry} leftIcon={<RefreshCw className="w-4 h-4" />} loading={retryJob.isPending}>
                    Retry Conversion
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

ConversionProgress.displayName = 'ConversionProgress';

export default ConversionProgress;

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
