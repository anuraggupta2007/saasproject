export type JobType = 'backup' | 'conversion' | 'scheduled';

export type JobStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
  | 'cancelled'
  | 'retrying'
  | 'uploading'
  | 'converting'
  | 'processing'
  | 'compressing'
  | 'validating';

export type ExportFormat = 'pdf' | 'csv' | 'excel';

export type SortOrder = 'asc' | 'desc';

export interface UnifiedJob {
  id: string;
  jobId: string;
  jobType: JobType;
  name: string;
  description?: string;
  status: JobStatus;
  accountEmail?: string;
  accountName?: string;
  provider?: string;
  inputFormat?: string;
  outputFormats?: string[];
  backupType?: string;
  fileCount: number;
  emailCount: number;
  totalSize: number;
  processedSize: number;
  compressedSize?: number;
  startedAt: string;
  completedAt?: string;
  duration: number;
  error?: JobError;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JobError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  timestamp: string;
  stage?: string;
}

export interface UnifiedHistoryFilter {
  jobType?: JobType[];
  status?: JobStatus[];
  provider?: string[];
  accountEmail?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  minSize?: number;
  maxSize?: number;
  inputFormat?: string[];
  outputFormat?: string[];
}

export interface SavedFilter {
  id: string;
  name: string;
  filter: UnifiedHistoryFilter;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface JobDetails extends UnifiedJob {
  timeline: TimelineEvent[];
  stats: JobStats;
  folderBreakdown?: FolderBreakdown[];
  convertedFiles?: ConvertedFile[];
  logs: LogEntry[];
  errorBreakdown?: ErrorBreakdown[];
  retryHistory?: RetryRecord[];
  settings?: Record<string, unknown>;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  stage: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  message: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface JobStats {
  totalEmails: number;
  totalSize: number;
  convertedSize?: number;
  totalAttachments?: number;
  attachmentSize?: number;
  foldersProcessed?: number;
  errors: number;
  warnings: number;
  duplicatesSkipped?: number;
  avgSpeed?: number;
  byFolder?: FolderStats[];
  byDate?: DateStats[];
}

export interface FolderStats {
  folderId: string;
  folderName: string;
  emailCount: number;
  size: number;
  duration: number;
  errors: number;
}

export interface DateStats {
  date: string;
  count: number;
  size: number;
}

export interface FolderBreakdown {
  folderId: string;
  folderName: string;
  emails: number;
  size: number;
  duration: number;
  status: JobStatus;
  error?: string;
}

export interface ConvertedFile {
  id: string;
  name: string;
  format: string;
  size: number;
  downloadUrl: string;
  expiresAt?: string;
  emailCount: number;
  downloadCount: number;
  verified: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  stage: string;
  message: string;
  context?: Record<string, unknown>;
  duration?: number;
}

export interface ErrorBreakdown {
  code: string;
  message: string;
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
  recoverable: boolean;
  samples: string[];
}

export interface RetryRecord {
  id: string;
  attempt: number;
  startedAt: string;
  completedAt?: string;
  status: JobStatus;
  error?: JobError;
}

export interface DownloadItem {
  id: string;
  jobId: string;
  jobName: string;
  jobType: JobType;
  fileName: string;
  fileType: string;
  format: string;
  size: number;
  downloadUrl: string;
  generatedAt: string;
  expiresAt?: string;
  downloadCount: number;
  status: 'available' | 'expired' | 'generating' | 'error';
  integrity?: string;
}

export interface Report {
  id: string;
  type: 'backup' | 'conversion' | 'storage' | 'usage' | 'activity';
  title: string;
  description: string;
  format: ExportFormat;
  generatedAt: string;
  downloadUrl: string;
  size: number;
  status: 'ready' | 'generating' | 'error';
  dateRange?: { from: string; to: string };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  status: 'success' | 'failure';
}

export interface HistoryDashboardStats {
  totalBackupJobs: number;
  totalConversionJobs: number;
  successfulJobs: number;
  failedJobs: number;
  runningJobs: number;
  totalDownloads: number;
  totalStorageUsed: number;
  avgProcessingTime: number;
  successRate: number;
}

export interface ActivityItem {
  id: string;
  type: 'backup_completed' | 'backup_failed' | 'conversion_completed' | 'conversion_failed' | 'download_completed' | 'report_generated' | 'job_deleted' | 'job_retried';
  jobId: string;
  jobName: string;
  jobType: JobType;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ColumnConfig {
  key: string;
  label: string;
  sortable: boolean;
  visible: boolean;
  width?: string;
}

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'destructive';
  requiresSelection: boolean;
}

export interface DownloadProgress {
  fileId: string;
  progress: number;
  speed: number;
  downloaded: number;
  total: number;
}
