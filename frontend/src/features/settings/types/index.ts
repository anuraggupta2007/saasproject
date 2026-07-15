export type Theme = 'light' | 'dark' | 'system';
export type AccentColor = 'brand' | 'blue' | 'purple' | 'emerald' | 'amber' | 'rose';
export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';
export type SidebarStyle = 'collapsed' | 'expanded' | 'overlay';
export type FontSize = 'small' | 'medium' | 'large';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type TimeFormat = '12h' | '24h';
export type NumberFormat = '1,234.56' | '1.234,56' | '1 234,56';
export type CurrencyDisplay = 'symbol' | 'code' | 'none';
export type SessionStatus = 'active' | 'expired' | 'revoked';
export type APIKeyStatus = 'active' | 'revoked' | 'expired';
export type TwoFactorMethod = 'totp' | 'sms' | 'email';
export type NotificationChannel = 'email' | 'in_app' | 'sms' | 'push';
export type NotificationFrequency = 'instant' | 'daily' | 'weekly' | 'never';

export interface UserProfile {
  id: string;
  email: string;
  emailVerified: boolean;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  country?: string;
  timezone?: string;
  dateFormat?: DateFormat;
  timeFormat?: TimeFormat;
  language?: string;
  bio?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  profileCompletion: number;
}

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  country?: string;
  timezone?: string;
  dateFormat?: DateFormat;
  timeFormat?: TimeFormat;
  language?: string;
  bio?: string;
  website?: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: TwoFactorMethod;
  backupCodes: string[];
  recoveryEmail?: string;
  sessionTimeout: number;
  loginNotifications: boolean;
  trustedDevices: TrustedDevice[];
}

export interface TrustedDevice {
  id: string;
  name: string;
  platform: string;
  browser: string;
  ipAddress: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

export interface ActiveSession {
  id: string;
  deviceName: string;
  platform: string;
  browser: string;
  ipAddress: string;
  location?: string;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface ConnectedAccount {
  id: string;
  provider: EmailProvider;
  email: string;
  displayName: string;
  avatar?: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSyncAt?: string;
  lastBackupAt?: string;
  syncEnabled: boolean;
  foldersCount: number;
  emailsCount: number;
  storageUsed: number;
  connectedAt: string;
  permissions: string[];
}

export type EmailProvider = 'gmail' | 'outlook' | 'microsoft365' | 'yahoo' | 'aol' | 'zoho' | 'icloud' | 'imap';

export interface APIKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  status: APIKeyStatus;
  permissions: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
}

export interface APIKeyCreateData {
  name: string;
  permissions: string[];
  expiresAt?: string;
}

export interface NotificationPreferences {
  channels: {
    email: boolean;
    inApp: boolean;
    sms: boolean;
    push: boolean;
  };
  types: NotificationTypePreferences;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  frequency: NotificationFrequency;
}

export interface NotificationTypePreferences {
  backupCompleted: { email: boolean; inApp: boolean; sms: boolean };
  backupFailed: { email: boolean; inApp: boolean; sms: boolean };
  conversionCompleted: { email: boolean; inApp: boolean; sms: boolean };
  conversionFailed: { email: boolean; inApp: boolean; sms: boolean };
  paymentSuccess: { email: boolean; inApp: boolean; sms: boolean };
  paymentFailure: { email: boolean; inApp: boolean; sms: boolean };
  licenseExpiry: { email: boolean; inApp: boolean; sms: boolean };
  securityAlerts: { email: boolean; inApp: boolean; sms: boolean };
  productUpdates: { email: boolean; inApp: boolean; sms: boolean };
}

export interface AppearanceSettings {
  theme: Theme;
  accentColor: AccentColor;
  density: LayoutDensity;
  sidebar: SidebarStyle;
  fontSize: FontSize;
  animations: boolean;
  reducedMotion: boolean;
}

export interface LanguageRegionSettings {
  language: string;
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  numberFormat: NumberFormat;
  currencyDisplay: CurrencyDisplay;
  currency: string;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private';
  showEmail: boolean;
  showPhone: boolean;
  allowAnalytics: boolean;
  allowMarketing: boolean;
  cookiePreferences: CookiePreferences;
  dataRetentionDays: number;
}

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  category: 'login' | 'profile' | 'security' | 'api_key' | 'connected_account' | 'subscription' | 'account';
  description: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SettingsDashboardData {
  profile: UserProfile;
  security: SecuritySettings;
  connectedAccounts: ConnectedAccount[];
  apiKeys: APIKey[];
  activeSessions: ActiveSession[];
  securityScore: number;
  recentActivity: ActivityLogEntry[];
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Notification {
  id: string;
  type: 'profile_updated' | 'password_changed' | 'email_changed' | '2fa_enabled' | '2fa_disabled' | 'api_key_created' | 'api_key_revoked' | 'account_deleted';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
