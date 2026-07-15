// ─── User & Auth ──────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin' | 'super_admin' | 'support' | 'billing_manager' | 'readonly';

export type PlanType = 'free' | 'starter' | 'professional' | 'enterprise';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'banned';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  isVerified: boolean;
  plan: PlanType;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface OAuthPayload {
  provider: 'google' | 'microsoft' | 'github';
  code: string;
  redirectUri: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, string[]>;
  requestId?: string;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

export type JobType = 'backup' | 'conversion' | 'upload' | 'download';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  userId: string;
  userName: string;
  metadata: Record<string, unknown>;
  errors: string[];
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  createdAt: string;
}

export interface BackupJob extends Job {
  type: 'backup';
  provider: string;
  accountId: string;
  totalEmails: number;
  backedUpEmails: number;
  storageUsed: number;
}

export interface ConversionJob extends Job {
  type: 'conversion';
  inputFormat: string;
  outputFormat: string;
  inputFileId: string;
  outputFileId?: string;
  fileSize: number;
}

// ─── Files ────────────────────────────────────────────────────────────────────

export type FileStatus = 'uploading' | 'processing' | 'ready' | 'expired' | 'error';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  status: FileStatus;
  url?: string;
  downloadUrl?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  loaded: number;
  total: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error';
  error?: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused';

export type PaymentStatus = 'succeeded' | 'pending' | 'failed' | 'refunded' | 'partially_refunded';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  tier: PlanType;
  description: string;
  features: string[];
  prices: Record<string, number>;
  limits: PlanLimits;
}

export interface PlanLimits {
  storageBytes: number;
  maxBackups: number;
  maxConversions: number;
  apiRequestsPerDay: number;
  maxFileSize: number;
}

export interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
}

export interface License {
  id: string;
  key: string;
  status: 'active' | 'expired' | 'revoked' | 'pending';
  planName: string;
  activatedAt?: string;
  expiresAt?: string;
  maxActivations: number;
  currentActivations: number;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank_transfer';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string;
  pdfUrl?: string;
  createdAt: string;
}

// ─── Support ──────────────────────────────────────────────────────────────────

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  userId: string;
  userName: string;
  userEmail: string;
  assignedTo?: string;
  messageCount: number;
  lastReplyAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin' | 'system';
  content: string;
  isInternalNote: boolean;
  createdAt: string;
}

// ─── WebSocket ────────────────────────────────────────────────────────────────

export type WSEventType =
  | 'backup.progress'
  | 'backup.completed'
  | 'backup.failed'
  | 'conversion.progress'
  | 'conversion.completed'
  | 'conversion.failed'
  | 'notification.new'
  | 'queue.update'
  | 'dashboard.update'
  | 'system.alert'
  | 'pong';

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: string;
}

export interface WSProgressPayload {
  jobId: string;
  progress: number;
  status: JobStatus;
  message?: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalBackups: number;
  totalConversions: number;
  storageUsed: number;
  revenue: number;
  activeSubscriptions: number;
}

export interface AnalyticsData {
  userGrowth: Array<{ date: string; count: number }>;
  revenueGrowth: Array<{ date: string; amount: number }>;
  topFeatures: Array<{ name: string; usage: number }>;
  errorRate: number;
  avgResponseTime: number;
}

// ─── Common ───────────────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface DateRange {
  start: string;
  end: string;
}

export type ExportFormat = 'csv' | 'json' | 'xlsx';

export interface ModalState {
  id: string;
  open: boolean;
  data?: unknown;
}
