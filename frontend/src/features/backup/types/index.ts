export type JobStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

export type BackupType = 'full' | 'incremental' | 'new_only';

export type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'cron';

export type StorageLocation = 'local' | 'external' | 'network' | 'cloud';

export type FolderType = 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive' | 'custom';

export type FilterOperator =
  | 'equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches'
  | 'greater_than'
  | 'less_than'
  | 'between';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface BackupJob {
  id: string;
  accountId: string;
  name: string;
  description?: string;
  backupType: BackupType;
  status: JobStatus;
  progress: JobProgress;
  stats: JobStats;
  settings: JobSettings;
  scheduleId?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: JobError;
  tags?: string[];
}

export interface JobProgress {
  currentStage: JobStage;
  totalFolders: number;
  processedFolders: number;
  totalEmails: number;
  processedEmails: number;
  currentFolder?: string;
  currentEmail?: string;
  bytesProcessed: number;
  totalBytes: number;
  downloadSpeed: number;
  uploadSpeed: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  percentage: number;
  stageProgress: Record<JobStage, number>;
}

export type JobStage =
  | 'initializing'
  | 'connecting'
  | 'authenticating'
  | 'listing_folders'
  | 'selecting_folders'
  | 'applying_filters'
  | 'fetching_messages'
  | 'downloading_attachments'
  | 'analyzing'
  | 'downloading'
  | 'processing'
  | 'compressing'
  | 'encrypting'
  | 'uploading'
  | 'verifying'
  | 'finalizing'
  | 'completed';

export interface JobStats {
  totalEmails: number;
  totalSize: number;
  totalAttachments: number;
  totalAttachmentsSize: number;
  foldersProcessed: number;
  errors: number;
  warnings: number;
  duplicatesSkipped: number;
  byFolder: FolderStats[];
  byDate: DateStats[];
}

export interface FolderStats {
  folderId: string;
  folderName: string;
  emailCount: number;
  size: number;
  attachmentCount: number;
  attachmentSize: number;
  duration: number;
  errors: number;
}

export interface DateStats {
  date: string;
  count: number;
  size: number;
}

export interface JobSettings {
  folderIds: string[];
  filters: MessageFilter[];
  destination: BackupDestination;
  compression: CompressionSettings;
  encryption: EncryptionSettings;
  notifications: NotificationSettings;
  retention: RetentionSettings;
  advanced: AdvancedSettings;
}

export interface JobError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  timestamp: string;
  stage?: JobStage;
}

export interface MessageFilter {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string | string[] | number | DateRange;
  enabled: boolean;
}

export type FilterField =
  | 'date'
  | 'sender'
  | 'recipient'
  | 'subject'
  | 'has_attachment'
  | 'attachment_name'
  | 'read'
  | 'flagged'
  | 'size'
  | 'label'
  | 'category'
  | 'message_id'
  | 'in_reply_to';

export interface DateRange {
  from: string;
  to: string;
}

export interface BackupDestination {
  location: StorageLocation;
  path: string;
  credentials?: Record<string, string>;
  bucket?: string;
  region?: string;
  endpoint?: string;
  validateOnStart: boolean;
  createFolderStructure: boolean;
  folderStructure: 'flat' | 'by_account' | 'by_date' | 'by_folder';
}

export interface CompressionSettings {
  enabled: boolean;
  algorithm: 'gzip' | 'brotli' | 'zstd' | 'lz4';
  level: number;
  splitSize?: number;
  passwordProtected: boolean;
}

export interface EncryptionSettings {
  enabled: boolean;
  algorithm: 'aes-256-gcm' | 'chacha20-poly1305';
  keyDerivation: 'pbkdf2' | 'argon2id';
  password?: string;
  keyFile?: string;
}

export interface NotificationSettings {
  onStart: boolean;
  onComplete: boolean;
  onFailure: boolean;
  onProgress?: { enabled: boolean; interval: number };
  channels: ('email' | 'webhook' | 'push' | 'slack')[];
  webhookUrl?: string;
  slackWebhook?: string;
}

export interface RetentionSettings {
  enabled: boolean;
  keepLast: number;
  keepDays: number;
  keepSize: number;
  deleteOnFailure: boolean;
}

export interface AdvancedSettings {
  maxConcurrentDownloads: number;
  maxConcurrentUploads: number;
  chunkSize: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  bandwidthLimit?: number;
  verifyChecksums: boolean;
  skipExisting: boolean;
  preserveTimestamps: boolean;
  followSymlinks: boolean;
  includeHidden: boolean;
}

export interface BackupSchedule {
  id: string;
  jobId: string;
  name: string;
  description?: string;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  timezone: string;
  startDate: string;
  endDate?: string;
  time: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  weekOfMonth?: number;
  quietHours?: QuietHours;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

export interface CreateScheduleRequest {
  jobId: string;
  name: string;
  description?: string;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  timezone: string;
  startDate: string;
  endDate?: string;
  time: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  weekOfMonth?: number;
  quietHours?: QuietHours;
}

export interface UpdateScheduleRequest {
  name?: string;
  description?: string;
  frequency?: ScheduleFrequency;
  cronExpression?: string;
  timezone?: string;
  startDate?: string;
  endDate?: string;
  time?: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  weekOfMonth?: number;
  quietHours?: QuietHours;
  enabled?: boolean;
}

export interface BackupHistoryItem {
  id: string;
  jobId: string;
  scheduleId?: string;
  accountId: string;
  accountEmail: string;
  provider: string;
  backupType: BackupType;
  status: JobStatus;
  startedAt: string;
  completedAt?: string;
  duration: number;
  emailsProcessed: number;
  size: number;
  compressedSize: number;
  attachmentCount: number;
  folderCount: number;
  error?: JobError;
  settingsSnapshot: JobSettings;
  tags?: string[];
}

export interface BackupHistoryDetails extends BackupHistoryItem {
  logs: LogEntry[];
  folderBreakdown: FolderBreakdown[];
  errorBreakdown: ErrorBreakdown[];
  timeline: TimelineEvent[];
  performance: PerformanceMetrics;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  stage: JobStage;
  message: string;
  context?: Record<string, unknown>;
  duration?: number;
}

export interface FolderBreakdown {
  folderId: string;
  folderName: string;
  emails: number;
  size: number;
  attachments: number;
  duration: number;
  status: JobStatus;
  error?: string;
}

export interface ErrorBreakdown {
  code: string;
  message: string;
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
  recoverable: number;
  samples: string[];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  stage: JobStage;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  message: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  avgDownloadSpeed: number;
  avgUploadSpeed: number;
  peakMemoryUsage: number;
  peakCpuUsage: number;
  networkLatency: number;
  apiCalls: number;
  errors: number;
}

export interface HistoryFilter {
  status?: JobStatus[];
  backupType?: BackupType[];
  accountId?: string[];
  provider?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface JobFilter {
  status?: JobStatus[];
  backupType?: BackupType[];
  accountId?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface CreateJobRequest {
  name: string;
  description?: string;
  accountId: string;
  backupType: BackupType;
  folderIds: string[];
  filters?: MessageFilter[];
  destination: BackupDestination;
  compression?: CompressionSettings;
  encryption?: EncryptionSettings;
  notifications?: NotificationSettings;
  retention?: RetentionSettings;
  advanced?: AdvancedSettings;
  schedule?: ScheduleData;
}

export interface UpdateJobRequest {
  id: string;
  name?: string;
  description?: string;
  backupType?: BackupType;
  folderIds?: string[];
  filters?: MessageFilter[];
  destination?: BackupDestination;
  compression?: CompressionSettings;
  encryption?: EncryptionSettings;
  notifications?: NotificationSettings;
  retention?: RetentionSettings;
  advanced?: AdvancedSettings;
  schedule?: ScheduleData;
}

export interface CreateScheduleRequest {
  jobId: string;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  timezone: string;
  startDate: string;
  endDate?: string;
  time: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  enabled: boolean;
  maxRetries: number;
}

export interface UpdateScheduleRequest {
  id: string;
  frequency?: ScheduleFrequency;
  cronExpression?: string;
  timezone?: string;
  startDate?: string;
  endDate?: string;
  time?: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  enabled?: boolean;
  maxRetries?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ConnectedAccount {
  id: string;
  userId: string;
  provider: EmailProvider;
  email: string;
  displayName: string;
  avatarUrl?: string;
  status: ConnectionStatus;
  capabilities: AccountCapabilities;
  settings: AccountSettings;
  stats: AccountStats;
  lastSyncAt?: string;
  lastSyncStatus?: JobStatus;
  lastSyncError?: string;
  createdAt: string;
  updatedAt: string;
}

export type EmailProvider =
  | 'gmail'
  | 'outlook'
  | 'microsoft365'
  | 'yahoo'
  | 'aol'
  | 'zoho'
  | 'icloud'
  | 'gmx'
  | 'yandex'
  | 'imap';

export type Provider = EmailProvider;

export interface ProviderInfo {
  id: Provider;
  name: string;
  logo?: string;
  color?: string;
  oauth: boolean;
  imap: boolean;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  capabilities: AccountCapabilities;
  maxConnections: number;
  rateLimit: number;
  features: string[];
  pricing?: { free: boolean; storageLimit?: number; maxAccounts?: number };
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error' | 'pending';

export interface AccountCapabilities {
  oauth: boolean;
  imap: boolean;
  smtp: boolean;
  labels: boolean;
  folders: boolean;
  push: boolean;
  search: boolean;
  maxFolderDepth: number;
  maxMessageSize: number;
  supportedAuth: ('oauth2' | 'password' | 'app_password')[];
}

export interface AccountSettings {
  imapHost?: string;
  imapPort?: number;
  imapSecurity: 'ssl' | 'tls' | 'starttls' | 'none';
  smtpHost?: string;
  smtpPort?: number;
  smtpSecurity: 'ssl' | 'tls' | 'starttls' | 'none';
  username?: string;
  password?: string;
  appPassword?: string;
  oauthToken?: string;
  oauthRefreshToken?: string;
  oauthExpiresAt?: string;
  syncInterval: number;
  syncFolders: string[];
  excludeFolders: string[];
  maxHistoryDays: number;
  includeAttachments: boolean;
  maxAttachmentSize: number;
}

export interface AccountStats {
  totalEmails: number;
  totalSize: number;
  totalAttachments: number;
  folderCount: number;
  lastBackupAt?: string;
  lastBackupSize: number;
  lastBackupEmails: number;
  nextScheduledBackup?: string;
  storageUsed: number;
  storageLimit: number;
}

export interface EmailProviderConfig {
  id: EmailProvider;
  name: string;
  logo: string;
  description: string;
  website: string;
  authMethods: ('oauth2' | 'password' | 'app_password')[];
  defaultImapHost: string;
  defaultImapPort: number;
  defaultImapSecurity: 'ssl' | 'tls' | 'starttls' | 'none';
  defaultSmtpHost: string;
  defaultSmtpPort: number;
  defaultSmtpSecurity: 'ssl' | 'tls' | 'starttls' | 'none';
  supportsLabels: boolean;
  supportsFolders: boolean;
  supportsPush: boolean;
  features: string[];
  setupGuideUrl: string;
}

export interface FolderInfo {
  id: string;
  name: string;
  fullName: string;
  path: string;
  type: FolderType;
  parentId?: string;
  children: FolderInfo[];
  emailCount: number;
  unreadCount: number;
  size: number;
  attributes: FolderAttributes;
  selectable: boolean;
  selected: boolean;
  expanded: boolean;
  level: number;
}

export interface FolderAttributes {
  noselect: boolean;
  noname: boolean;
  marked: boolean;
  unmarked: boolean;
}

export interface MessageSummary {
  id: string;
  messageId: string;
  folderId: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  date: string;
  size: number;
  hasAttachments: boolean;
  attachmentCount: number;
  read: boolean;
  flagged: boolean;
  labels: string[];
  snippet: string;
}

export interface EmailAddress {
  name?: string;
  address: string;
}

export interface StorageUsage {
  used: number;
  limit: number;
  percentage: number;
  byAccount: Record<string, { used: number; limit: number }>;
  byProvider: Record<string, { used: number; limit: number }>;
  trend: { date: string; used: number }[];
  projectedExhaustion?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    imap?: { connected: boolean; latency: number; capabilities: string[] };
    smtp?: { connected: boolean; latency: number };
    oauth?: { valid: boolean; scopes: string[]; expiresAt?: string };
    folders?: { count: number; sample: string[] };
  };
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
    suggestion?: string;
  };
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<WizardStepProps>;
  validate: (data: WizardData) => Promise<ValidationResult>;
  optional?: boolean;
}

export interface WizardStepProps {
  data: WizardData;
  onChange: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  canGoNext: boolean;
  canGoBack: boolean;
  isLastStep: boolean;
}

export interface WizardData {
  accountId?: string;
  backupType: BackupType;
  jobName: string;
  jobDescription?: string;
  folderIds: string[];
  filters: MessageFilter[];
  destination: BackupDestination;
  compression: CompressionSettings;
  encryption: EncryptionSettings;
  notifications: NotificationSettings;
  retention: RetentionSettings;
  advanced: AdvancedSettings;
  schedule: ScheduleData;
}

export interface ScheduleData {
  frequency: ScheduleFrequency;
  cronExpression?: string;
  timezone: string;
  startDate: string;
  endDate?: string;
  time: string;
  daysOfWeek: number[];
  dayOfMonth?: number;
  weekOfMonth?: number;
  quietHours?: QuietHours;
  runNow: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export interface ProviderConnectionResponse {
  success: boolean;
  message: string;
  accountId?: string;
}

export interface ProviderConnectionFormData {
  provider: EmailProvider;
  authMethod: 'oauth2' | 'password' | 'app_password';
  email: string;
  password?: string;
  appPassword?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecurity?: 'ssl' | 'tls' | 'starttls' | 'none';
  smtpHost?: string;
  smtpPort?: number;
  smtpSecurity?: 'ssl' | 'tls' | 'starttls' | 'none';
}

export interface BackupJobFormData {
  accountId: string;
  name: string;
  description?: string;
  backupType: BackupType;
  folderIds: string[];
  filters: MessageFilter[];
  destination: BackupDestination;
  compression: CompressionSettings;
  encryption: EncryptionSettings;
  notifications: NotificationSettings;
  retention: RetentionSettings;
  advanced: AdvancedSettings;
  schedule: ScheduleData;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export interface EmptyStateConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export interface TableColumn<T> {
  key: string;
  header: string;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  cellClassName?: string;
  headerClassName?: string;
}

export interface TableConfig<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyField: string;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  filters?: Record<string, unknown>;
  onFilter?: (filters: Record<string, unknown>) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  loading?: boolean;
  emptyState?: EmptyStateConfig;
  rowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  virtualized?: boolean;
  rowHeight?: number;
}

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area' | 'pie' | 'donut';
}

export interface ChartConfig {
  series: ChartSeries[];
  xAxis?: { type: 'category' | 'number' | 'time'; label?: string };
  yAxis?: { type: 'number' | 'percentage'; label?: string; min?: number; max?: number };
  tooltip?: { formatter?: (value: number, name: string) => string };
  legend?: { show: boolean; position?: 'top' | 'bottom' | 'left' | 'right' };
  grid?: { show: boolean };
  colors?: string[];
  responsive?: boolean;
  height?: number;
  animation?: boolean;
}