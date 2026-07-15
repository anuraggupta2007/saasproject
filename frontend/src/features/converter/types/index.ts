export type InputFormat =
  | 'mbox'
  | 'pst'
  | 'ost'
  | 'eml'
  | 'msg'
  | 'maildir'
  | 'emlx';

export type OutputFormat =
  | 'pst'
  | 'mbox'
  | 'eml'
  | 'msg'
  | 'pdf'
  | 'html'
  | 'mht'
  | 'txt'
  | 'csv'
  | 'docx';

export type ConversionStatus =
  | 'pending'
  | 'queued'
  | 'uploading'
  | 'validating'
  | 'converting'
  | 'processing'
  | 'compressing'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
  | 'cancelled'
  | 'paused'
  | 'retrying';

export type ConversionStage =
  | 'initializing'
  | 'uploading'
  | 'validating'
  | 'parsing'
  | 'extracting'
  | 'converting'
  | 'formatting'
  | 'compressing'
  | 'finalizing'
  | 'completed';

export type FileStatus =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'validating'
  | 'valid'
  | 'invalid'
  | 'converting'
  | 'converted'
  | 'failed';

export type OutputLocation = 'local' | 'external' | 'network';

export type NamingConvention =
  | 'original'
  | 'date_original'
  | 'folder_original'
  | 'custom';

export interface InputFileInfo {
  id: string;
  name: string;
  format: InputFormat;
  size: number;
  status: FileStatus;
  progress: number;
  error?: string;
  uploadedSize: number;
  uploadSpeed: number;
  file?: File;
}

export interface ConversionJob {
  id: string;
  name: string;
  description?: string;
  status: ConversionStatus;
  stage: ConversionStage;
  inputFiles: InputFileInfo[];
  outputFormats: OutputFormat[];
  options: ConversionOptions;
  filters: ConversionFilters;
  destination: ConversionDestination;
  progress: ConversionProgress;
  stats: ConversionStats;
  error?: ConversionError;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletionAt?: string;
}

export interface ConversionOptions {
  preserveFolderStructure: boolean;
  preserveMetadata: boolean;
  preserveAttachments: boolean;
  includeHeaders: boolean;
  includeDeletedItems: boolean;
  mergeOutputFiles: boolean;
  splitLargeFiles: boolean;
  splitSizeMb: number;
  namingConvention: NamingConvention;
  customNamingPattern?: string;
}

export interface ConversionFilters {
  dateFrom?: string;
  dateTo?: string;
  sender?: string;
  recipient?: string;
  subject?: string;
  hasAttachments?: boolean;
  readStatus?: 'all' | 'read' | 'unread';
  starred?: boolean;
  minSize?: number;
  maxSize?: number;
  folderIds?: string[];
}

export interface ConversionDestination {
  location: OutputLocation;
  path: string;
  credentials?: Record<string, string>;
}

export interface ConversionProgress {
  overallPercentage: number;
  currentFileIndex: number;
  totalFiles: number;
  currentFileName: string;
  currentStage: ConversionStage;
  stageProgress: number;
  filesProcessed: number;
  totalEmails: number;
  processedEmails: number;
  bytesProcessed: number;
  totalBytes: number;
  conversionSpeed: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
}

export interface ConversionStats {
  totalFiles: number;
  convertedFiles: number;
  failedFiles: number;
  totalEmails: number;
  totalSize: number;
  convertedSize: number;
  attachmentCount: number;
  errorCount: number;
  warningCount: number;
  avgConversionSpeed: number;
}

export interface ConversionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  timestamp: string;
  stage?: ConversionStage;
}

export interface ConversionHistoryItem {
  id: string;
  jobId: string;
  name: string;
  inputFormat: InputFormat;
  outputFormats: OutputFormat[];
  status: ConversionStatus;
  fileCount: number;
  totalSize: number;
  convertedSize: number;
  emailCount: number;
  startedAt: string;
  completedAt?: string;
  duration: number;
  error?: ConversionError;
  tags?: string[];
}

export interface ConversionHistoryDetails extends ConversionHistoryItem {
  inputFiles: InputFileInfo[];
  options: ConversionOptions;
  filters: ConversionFilters;
  destination: ConversionDestination;
  stats: ConversionStats;
  logs: ConversionLogEntry[];
  timeline: ConversionTimelineEvent[];
  convertedFiles: ConvertedFile[];
}

export interface ConversionLogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  stage: ConversionStage;
  message: string;
  context?: Record<string, unknown>;
  duration?: number;
}

export interface ConversionTimelineEvent {
  id: string;
  timestamp: string;
  stage: ConversionStage;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  message: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface ConvertedFile {
  id: string;
  name: string;
  format: OutputFormat;
  size: number;
  downloadUrl: string;
  expiresAt?: string;
  emailCount: number;
  folderCount: number;
}

export interface ConversionFilter {
  status?: ConversionStatus[];
  inputFormat?: InputFormat[];
  outputFormat?: OutputFormat[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CreateConversionRequest {
  name: string;
  description?: string;
  fileIds: string[];
  outputFormats: OutputFormat[];
  options: ConversionOptions;
  filters: ConversionFilters;
  destination: ConversionDestination;
  tags?: string[];
}

export interface UpdateConversionRequest {
  id: string;
  name?: string;
  description?: string;
  options?: Partial<ConversionOptions>;
  filters?: Partial<ConversionFilters>;
  destination?: Partial<ConversionDestination>;
  tags?: string[];
}

export interface UploadResponse {
  id: string;
  name: string;
  format: InputFormat;
  size: number;
  status: FileStatus;
}

export interface FileValidationResponse {
  valid: boolean;
  format: InputFormat;
  size: number;
  emailCount?: number;
  folderCount?: number;
  passwordProtected?: boolean;
  error?: string;
  warnings?: string[];
}

export interface ConversionDashboardStats {
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalFilesConverted: number;
  totalDataProcessed: number;
  avgConversionTime: number;
  successRate: number;
}

export interface ConversionActivity {
  id: string;
  type: 'upload_completed' | 'conversion_started' | 'conversion_completed' | 'conversion_failed' | 'download_ready';
  jobId: string;
  jobName: string;
  message: string;
  timestamp: string;
}

export interface DownloadInfo {
  id: string;
  fileId: string;
  fileName: string;
  format: OutputFormat;
  size: number;
  downloadUrl: string;
  expiresAt: string;
  downloaded: boolean;
}

export interface QueueItem {
  id: string;
  jobId: string;
  jobName: string;
  position: number;
  status: ConversionStatus;
  estimatedStartAt?: string;
}

export interface FileFormatInfo {
  format: string;
  extension: string;
  mimeTypes: string[];
  maxFileSize: number;
  description: string;
  icon: string;
}

export const INPUT_FORMATS: FileFormatInfo[] = [
  { format: 'mbox', extension: '.mbox', mimeTypes: ['application/mbox', 'application/octet-stream'], maxFileSize: 5 * 1024 * 1024 * 1024, description: 'Mailbox format used by many email clients', icon: 'Mail' },
  { format: 'pst', extension: '.pst', mimeTypes: ['application/vnd.ms-outlook', 'application/octet-stream'], maxFileSize: 50 * 1024 * 1024 * 1024, description: 'Microsoft Outlook Data File', icon: 'Mail' },
  { format: 'ost', extension: '.ost', mimeTypes: ['application/vnd.ms-outlook', 'application/octet-stream'], maxFileSize: 50 * 1024 * 1024 * 1024, description: 'Microsoft Outlook Offline Data File', icon: 'Mail' },
  { format: 'eml', extension: '.eml', mimeTypes: ['message/rfc822', 'application/octet-stream'], maxFileSize: 100 * 1024 * 1024, description: 'Standard email message format', icon: 'Mail' },
  { format: 'msg', extension: '.msg', mimeTypes: ['application/vnd.ms-outlook', 'application/octet-stream'], maxFileSize: 100 * 1024 * 1024, description: 'Microsoft Outlook Message format', icon: 'Mail' },
  { format: 'maildir', extension: '', mimeTypes: ['inode/directory'], maxFileSize: 10 * 1024 * 1024 * 1024, description: 'Maildir directory format', icon: 'FolderArchive' },
  { format: 'emlx', extension: '.emlx', mimeTypes: ['application/octet-stream'], maxFileSize: 100 * 1024 * 1024, description: 'Apple Mail email format', icon: 'Mail' },
];

export const OUTPUT_FORMATS: FileFormatInfo[] = [
  { format: 'pst', extension: '.pst', mimeTypes: ['application/vnd.ms-outlook'], maxFileSize: 50 * 1024 * 1024 * 1024, description: 'Microsoft Outlook Data File', icon: 'Mail' },
  { format: 'mbox', extension: '.mbox', mimeTypes: ['application/mbox'], maxFileSize: 5 * 1024 * 1024 * 1024, description: 'Mailbox format', icon: 'Mail' },
  { format: 'eml', extension: '.eml', mimeTypes: ['message/rfc822'], maxFileSize: 100 * 1024 * 1024, description: 'Standard email format', icon: 'Mail' },
  { format: 'msg', extension: '.msg', mimeTypes: ['application/vnd.ms-outlook'], maxFileSize: 100 * 1024 * 1024, description: 'Outlook Message format', icon: 'Mail' },
  { format: 'pdf', extension: '.pdf', mimeTypes: ['application/pdf'], maxFileSize: 200 * 1024 * 1024, description: 'Adobe PDF Document', icon: 'FileText' },
  { format: 'html', extension: '.html', mimeTypes: ['text/html'], maxFileSize: 100 * 1024 * 1024, description: 'HTML Web Page', icon: 'FileText' },
  { format: 'mht', extension: '.mht', mimeTypes: ['application/vnd.ms-html'], maxFileSize: 100 * 1024 * 1024, description: 'MHTML Web Archive', icon: 'FileText' },
  { format: 'txt', extension: '.txt', mimeTypes: ['text/plain'], maxFileSize: 50 * 1024 * 1024, description: 'Plain Text', icon: 'FileText' },
  { format: 'csv', extension: '.csv', mimeTypes: ['text/csv'], maxFileSize: 50 * 1024 * 1024, description: 'CSV Metadata Export', icon: 'FileText' },
  { format: 'docx', extension: '.docx', mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'], maxFileSize: 200 * 1024 * 1024, description: 'Microsoft Word Document', icon: 'FileText' },
];

export const VALID_FORMAT_COMBINATIONS: Record<InputFormat, OutputFormat[]> = {
  mbox: ['pst', 'eml', 'msg', 'pdf', 'html', 'mht', 'txt', 'csv'],
  pst: ['mbox', 'eml', 'msg', 'pdf', 'html', 'mht', 'txt', 'csv'],
  ost: ['mbox', 'eml', 'msg', 'pdf', 'html', 'mht', 'txt', 'csv'],
  eml: ['pst', 'mbox', 'msg', 'pdf', 'html', 'mht', 'txt', 'csv', 'docx'],
  msg: ['pst', 'mbox', 'eml', 'pdf', 'html', 'mht', 'txt', 'csv', 'docx'],
  maildir: ['pst', 'mbox', 'eml', 'msg', 'pdf', 'html', 'mht', 'txt', 'csv'],
  emlx: ['pst', 'mbox', 'eml', 'msg', 'pdf', 'html', 'mht', 'txt', 'csv', 'docx'],
};

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface ConversionWizardData {
  files: InputFileInfo[];
  outputFormats: OutputFormat[];
  options: ConversionOptions;
  filters: ConversionFilters;
  destination: ConversionDestination;
}

export const DEFAULT_CONVERSION_OPTIONS: ConversionOptions = {
  preserveFolderStructure: true,
  preserveMetadata: true,
  preserveAttachments: true,
  includeHeaders: true,
  includeDeletedItems: false,
  mergeOutputFiles: false,
  splitLargeFiles: false,
  splitSizeMb: 100,
  namingConvention: 'original',
};

export const DEFAULT_CONVERSION_FILTERS: ConversionFilters = {
  readStatus: 'all',
  starred: false,
};

export const DEFAULT_CONVERSION_DESTINATION: ConversionDestination = {
  location: 'local',
  path: '/converted',
};

export const DEFAULT_WIZARD_DATA: ConversionWizardData = {
  files: [],
  outputFormats: [],
  options: DEFAULT_CONVERSION_OPTIONS,
  filters: DEFAULT_CONVERSION_FILTERS,
  destination: DEFAULT_CONVERSION_DESTINATION,
};

export type ConversionStageInfo = {
  stage: ConversionStage;
  label: string;
  description: string;
};

export const CONVERSION_STAGES: ConversionStageInfo[] = [
  { stage: 'initializing', label: 'Initializing', description: 'Setting up conversion environment' },
  { stage: 'uploading', label: 'Uploading', description: 'Uploading files to server' },
  { stage: 'validating', label: 'Validating', description: 'Validating file format and integrity' },
  { stage: 'parsing', label: 'Parsing', description: 'Parsing email data structures' },
  { stage: 'extracting', label: 'Extracting', description: 'Extracting emails and attachments' },
  { stage: 'converting', label: 'Converting', description: 'Converting to target format' },
  { stage: 'formatting', label: 'Formatting', description: 'Formatting output files' },
  { stage: 'compressing', label: 'Compressing', description: 'Compressing output files' },
  { stage: 'finalizing', label: 'Finalizing', description: 'Finalizing conversion results' },
  { stage: 'completed', label: 'Completed', description: 'Conversion completed successfully' },
];

export type NotificationType =
  | 'upload_completed'
  | 'conversion_started'
  | 'conversion_completed'
  | 'conversion_failed'
  | 'download_ready';

export interface ConversionNotification {
  id: string;
  type: NotificationType;
  jobId: string;
  jobName: string;
  message: string;
  timestamp: string;
  read: boolean;
}
