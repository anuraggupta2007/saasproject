export type AdminRole = 'super_admin' | 'admin' | 'support' | 'billing_manager' | 'readonly';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'banned';
export type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise';
export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type PaymentStatus = 'succeeded' | 'pending' | 'failed' | 'refunded' | 'partially_refunded';
export type SystemStatus = 'healthy' | 'warning' | 'critical' | 'unknown';
export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import' | 'send' | 'archive';
export type AuditResult = 'success' | 'failure' | 'partial';
export type NotificationType = 'announcement' | 'maintenance' | 'alert' | 'promotional';
export type SortDirection = 'asc' | 'desc';
export type BulkAction = 'suspend' | 'activate' | 'delete' | 'export' | 'assign_role';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: AdminRole;
  planTier: PlanTier;
  status: UserStatus;
  emailVerified: boolean;
  registeredAt: string;
  lastLogin?: string;
  storageUsed: number;
  storageLimit: number;
  totalBackups: number;
  totalConversions: number;
  apiRequests: number;
  mfaEnabled: boolean;
  tags?: string[];
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  role?: AdminRole;
  planTier?: PlanTier;
  status?: UserStatus;
  storageLimit?: number;
  tags?: string[];
}

export interface AdminSubscription {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  planName: string;
  planTier: PlanTier;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  createdAt: string;
}

export interface AdminLicense {
  id: string;
  key: string;
  userId: string;
  userName: string;
  userEmail: string;
  planName: string;
  status: 'active' | 'expired' | 'revoked' | 'pending';
  activatedAt?: string;
  expiresAt?: string;
  maxActivations: number;
  currentActivations: number;
  lastCheckedAt?: string;
  createdAt: string;
}

export interface AdminPayment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: 'stripe' | 'razorpay' | 'manual';
  invoiceId?: string;
  description?: string;
  createdAt: string;
  refundedAt?: string;
  refundAmount?: number;
}

export interface AdminJob {
  id: string;
  userId: string;
  userName: string;
  type: 'backup' | 'conversion';
  status: JobStatus;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  queuePosition?: number;
  errors: string[];
  resourceUsage?: { cpu: number; memory: number; storage: number };
  metadata?: Record<string, unknown>;
}

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
  assignedToName?: string;
  category: string;
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
  attachments?: Array<{ id: string; name: string; url: string; size: number }>;
  createdAt: string;
}

export interface TicketReplyData {
  content: string;
  isInternalNote?: boolean;
}

export interface AdminAnalytics {
  userGrowth: Array<{ date: string; total: number; active: number; new: number }>;
  revenueGrowth: Array<{ date: string; mrr: number; arr: number; newRevenue: number }>;
  conversionStats: { total: number; successRate: number; avgDuration: number; byFormat: Record<string, number> };
  backupStats: { total: number; successRate: number; avgSize: number; byProvider: Record<string, number> };
  featureUsage: Array<{ feature: string; users: number; percentage: number }>;
  deviceUsage: Array<{ device: string; users: number; percentage: number }>;
  browserUsage: Array<{ browser: string; users: number; percentage: number }>;
  geoDistribution: Array<{ country: string; users: number; percentage: number }>;
}

export interface SystemHealth {
  overall: SystemStatus;
  score: number;
  services: SystemService[];
  metrics: SystemMetrics;
  lastChecked: string;
}

export interface SystemService {
  name: string;
  status: SystemStatus;
  uptime: number;
  responseTime?: number;
  errorRate?: number;
  lastChecked: string;
  details?: string;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  queueSize: number;
  activeWorkers: number;
  apiRequestsPerMinute: number;
  avgResponseTime: number;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: AdminRole;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress: string;
  userAgent: string;
  result: AuditResult;
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  audience: 'all' | 'active' | 'trial' | 'premium' | 'custom';
  audienceFilter?: string[];
  scheduledAt?: string;
  sentAt?: string;
  deliveredCount: number;
  readCount: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  createdAt: string;
}

export interface NotificationCreateData {
  type: NotificationType;
  title: string;
  message: string;
  audience: 'all' | 'active' | 'trial' | 'premium' | 'custom';
  audienceFilter?: string[];
  scheduledAt?: string;
}

export interface AppSettings {
  general: {
    siteName: string;
    siteUrl: string;
    supportEmail: string;
    defaultTimezone: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  emailProviders: Array<{ id: string; name: string; enabled: boolean; config: Record<string, string> }>;
  paymentProviders: Array<{ id: string; name: string; enabled: boolean; config: Record<string, string> }>;
  storageProviders: Array<{ id: string; name: string; enabled: boolean; config: Record<string, string> }>;
  featureFlags: Array<{ key: string; enabled: boolean; description: string; rolloutPercentage: number }>;
  security: {
    passwordMinLength: number;
    requireMfa: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    allowedIpRanges: string[];
  };
  branding: {
    logoUrl: string;
    primaryColor: string;
    faviconUrl: string;
    companyName: string;
  };
  localization: {
    defaultLanguage: string;
    enabledLanguages: string[];
    dateFormat: string;
    timeFormat: string;
  };
}

export interface RoleDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
  createdAt: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
}

export interface AdminError {
  id: string;
  type: 'api' | 'worker' | 'queue' | 'system';
  message: string;
  stack?: string;
  source: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  status: 'new' | 'investigating' | 'resolved' | 'archived';
  assignedTo?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  onlineUsers: number;
  premiumUsers: number;
  trialUsers: number;
  revenue: number;
  activeSubscriptions: number;
  activeLicenses: number;
  conversionJobsToday: number;
  backupJobsToday: number;
  apiRequests: number;
  storageUsage: number;
  systemHealthScore: number;
}
