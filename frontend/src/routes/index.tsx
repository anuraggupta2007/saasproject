import { lazy } from 'react'
import { ROUTES } from './constants'

// ─── Lazy Page Imports ────────────────────────────────────────────────────────
const HomePage = lazy(() => import('@/pages/public/HomePage'))
const FeaturesPage = lazy(() => import('@/pages/public/FeaturesPage'))
const PricingPage = lazy(() => import('@/pages/public/PricingPage'))
const DownloadPage = lazy(() => import('@/pages/public/DownloadPage'))
const BlogPage = lazy(() => import('@/pages/public/BlogPage'))
const DocsPage = lazy(() => import('@/pages/public/DocsPage'))
const FaqPage = lazy(() => import('@/pages/public/FaqPage'))
const ContactPage = lazy(() => import('@/pages/public/ContactPage'))
const AboutPage = lazy(() => import('@/pages/public/AboutPage'))
const PrivacyPage = lazy(() => import('@/pages/public/PrivacyPage'))
const TermsPage = lazy(() => import('@/pages/public/TermsPage'))

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/PasswordPages').then((m) => ({ default: m.ForgotPasswordPage })),
)
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/PasswordPages').then((m) => ({ default: m.ResetPasswordPage })),
)
const EmailVerificationPage = lazy(() =>
  import('@/pages/auth/PasswordPages').then((m) => ({ default: m.EmailVerificationPage })),
)

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const BackupJobsPage = lazy(() => import('@/pages/dashboard/BackupJobsPage'))
const ConvertPage = lazy(() => import('@/pages/dashboard/ConvertPage'))
const UploadPage = lazy(() => import('@/pages/dashboard/UploadPage'))
const AccountsPage = lazy(() => import('@/pages/dashboard/AccountsPage'))
const HistoryPage = lazy(() => import('@/pages/dashboard/HistoryPage'))
const DownloadsPage = lazy(() => import('@/pages/dashboard/DownloadsPage'))
const NotificationsPage = lazy(() => import('@/pages/dashboard/NotificationsPage'))
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage'))
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage'))
const BillingPage = lazy(() => import('@/pages/dashboard/BillingPage'))
const ApiKeysPage = lazy(() => import('@/pages/dashboard/ApiKeysPage'))
const LicensePage = lazy(() => import('@/pages/dashboard/LicensePage'))
const SupportPage = lazy(() => import('@/pages/dashboard/SupportPage'))

const BackupDashboardPage = lazy(() => import('@/features/backup/pages/BackupDashboard'))
const BackupWizardPage = lazy(() => import('@/features/backup/pages/BackupWizard'))
const BackupProgressPage = lazy(() => import('@/features/backup/pages/BackupProgress'))
const BackupHistoryPage = lazy(() => import('@/features/backup/pages/BackupHistory'))
const BackupDetailsPage = lazy(() => import('@/features/backup/pages/BackupDetails'))

const ConverterDashboardPage = lazy(() => import('@/features/converter/pages/ConverterDashboard'))
const ConversionWizardPage = lazy(() => import('@/features/converter/pages/ConversionWizard'))
const ConversionProgressPage = lazy(() => import('@/features/converter/pages/ConversionProgress'))
const ConversionHistoryPage = lazy(() => import('@/features/converter/pages/ConversionHistory'))
const ConversionDetailsPage = lazy(() => import('@/features/converter/pages/ConversionDetails'))
const DownloadCenterPage = lazy(() => import('@/features/converter/pages/DownloadCenter'))

const HistoryDashboardPage = lazy(() => import('@/features/history/pages/HistoryDashboard'))
const UnifiedHistoryPage = lazy(() => import('@/features/history/pages/UnifiedHistory'))
const HistoryJobDetailsPage = lazy(() => import('@/features/history/pages/JobDetails'))
const HistoryDownloadCenterPage = lazy(() => import('@/features/history/pages/DownloadCenter'))
const ReportsPage = lazy(() => import('@/features/history/pages/Reports'))
const AuditLogsPage = lazy(() => import('@/features/history/pages/AuditLogs'))

const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))

const AdminOverviewPage = lazy(() => import('@/features/admin/pages/AdminDashboard'))
const AdminUserManagementPage = lazy(() => import('@/features/admin/pages/UserManagement'))
const AdminUserDetailPage = lazy(() => import('@/features/admin/pages/UserDetail'))
const AdminSubscriptionPage = lazy(() => import('@/features/admin/pages/SubscriptionManagement'))
const AdminPaymentPage = lazy(() => import('@/features/admin/pages/PaymentManagement'))
const AdminJobMonitoringPage = lazy(() => import('@/features/admin/pages/JobMonitoring'))
const AdminSupportCenterPage = lazy(() => import('@/features/admin/pages/SupportCenter'))
const AdminTicketDetailsPage = lazy(() => import('@/features/admin/pages/TicketDetails'))
const AdminAnalyticsPage = lazy(() => import('@/features/admin/pages/AnalyticsDashboard'))
const AdminSystemMonitoringPage = lazy(() => import('@/features/admin/pages/SystemMonitoring'))
const AdminAuditLogsPage = lazy(() => import('@/features/admin/pages/AuditLogs'))
const AdminNotificationsPage = lazy(() => import('@/features/admin/pages/NotificationsManagement'))
const AdminSettingsPage = lazy(() => import('@/features/admin/pages/ApplicationSettings'))
const AdminRolesPage = lazy(() => import('@/features/admin/pages/RolesPermissions'))
const AdminErrorsPage = lazy(() => import('@/features/admin/pages/ErrorManagement'))

const BillingDashboardPage = lazy(() => import('@/features/billing/pages/BillingDashboard'))
const BillingPricingPage = lazy(() => import('@/features/billing/pages/PricingPage'))
const BillingSubscriptionPage = lazy(() => import('@/features/billing/pages/SubscriptionManagement'))
const BillingLicensePage = lazy(() => import('@/features/billing/pages/LicenseManagement'))
const BillingCheckoutPage = lazy(() => import('@/features/billing/pages/Checkout'))
const BillingPaymentMethodsPage = lazy(() => import('@/features/billing/pages/PaymentMethods'))
const BillingInvoicesPage = lazy(() => import('@/features/billing/pages/Invoices'))
const BillingHistoryPage = lazy(() => import('@/features/billing/pages/BillingHistory'))
const BillingUsagePage = lazy(() => import('@/features/billing/pages/UsageLimits'))

const SettingsDashboardPage = lazy(() => import('@/features/settings/pages/SettingsDashboard'))
const SettingsProfilePage = lazy(() => import('@/features/settings/pages/ProfileManagement'))
const SettingsSecurityPage = lazy(() => import('@/features/settings/pages/SecuritySettings'))
const SettingsConnectedAccountsPage = lazy(() => import('@/features/settings/pages/ConnectedAccounts'))
const SettingsApiKeysPage = lazy(() => import('@/features/settings/pages/APIKeys'))
const SettingsNotificationsPage = lazy(() => import('@/features/settings/pages/NotificationPreferences'))
const SettingsAppearancePage = lazy(() => import('@/features/settings/pages/Appearance'))
const SettingsLanguagePage = lazy(() => import('@/features/settings/pages/LanguageRegion'))
const SettingsPrivacyPage = lazy(() => import('@/features/settings/pages/Privacy'))
const SettingsAccountPage = lazy(() => import('@/features/settings/pages/AccountManagement'))
const SettingsActivityPage = lazy(() => import('@/features/settings/pages/ActivityLog'))

// ─── Route Configuration Types ────────────────────────────────────────────────
export interface RouteConfig {
  path: string
  component: React.LazyExoticComponent<React.ComponentType>
  layout?: 'public' | 'dashboard' | 'admin' | 'none'
  auth?: boolean
  adminOnly?: boolean
}

// ─── Public Routes ────────────────────────────────────────────────────────────
export const publicRoutes: RouteConfig[] = [
  { path: ROUTES.HOME, component: HomePage, layout: 'public' },
  { path: ROUTES.FEATURES, component: FeaturesPage, layout: 'public' },
  { path: ROUTES.PRICING, component: PricingPage, layout: 'public' },
  { path: ROUTES.DOWNLOAD, component: DownloadPage, layout: 'public' },
  { path: ROUTES.BLOG, component: BlogPage, layout: 'public' },
  { path: ROUTES.DOCS, component: DocsPage, layout: 'public' },
  { path: ROUTES.FAQ, component: FaqPage, layout: 'public' },
  { path: ROUTES.CONTACT, component: ContactPage, layout: 'public' },
  { path: ROUTES.ABOUT, component: AboutPage, layout: 'public' },
  { path: ROUTES.PRIVACY, component: PrivacyPage, layout: 'public' },
  { path: ROUTES.TERMS, component: TermsPage, layout: 'public' },
]

// ─── Auth Routes ──────────────────────────────────────────────────────────────
export const authRoutes: RouteConfig[] = [
  { path: ROUTES.LOGIN, component: LoginPage, layout: 'none' },
  { path: ROUTES.REGISTER, component: RegisterPage, layout: 'none' },
  { path: ROUTES.FORGOT_PASSWORD, component: ForgotPasswordPage, layout: 'none' },
  { path: ROUTES.RESET_PASSWORD, component: ResetPasswordPage, layout: 'none' },
  { path: ROUTES.VERIFY_EMAIL, component: EmailVerificationPage, layout: 'none' },
]

// ─── Dashboard Routes ─────────────────────────────────────────────────────────
export const dashboardRoutes: RouteConfig[] = [
  { path: ROUTES.DASHBOARD, component: DashboardPage, layout: 'dashboard', auth: true },
  { path: ROUTES.BACKUP, component: BackupDashboardPage, layout: 'dashboard', auth: true },
  { path: ROUTES.BACKUP_WIZARD, component: BackupWizardPage, layout: 'dashboard', auth: true },
  { path: ROUTES.BACKUP_PROGRESS, component: BackupProgressPage, layout: 'dashboard', auth: true },
  { path: ROUTES.BACKUP_HISTORY, component: BackupHistoryPage, layout: 'dashboard', auth: true },
  { path: ROUTES.BACKUP_HISTORY_DETAILS, component: BackupDetailsPage, layout: 'dashboard', auth: true },
  { path: ROUTES.ACCOUNTS, component: AccountsPage, layout: 'dashboard', auth: true },
  { path: ROUTES.CONVERT, component: ConverterDashboardPage, layout: 'dashboard', auth: true },
  { path: ROUTES.CONVERT_WIZARD, component: ConversionWizardPage, layout: 'dashboard', auth: true },
  { path: ROUTES.CONVERT_PROGRESS, component: ConversionProgressPage, layout: 'dashboard', auth: true },
  { path: ROUTES.CONVERT_HISTORY, component: ConversionHistoryPage, layout: 'dashboard', auth: true },
  { path: ROUTES.CONVERT_HISTORY_DETAILS, component: ConversionDetailsPage, layout: 'dashboard', auth: true },
  { path: ROUTES.CONVERT_DOWNLOADS, component: DownloadCenterPage, layout: 'dashboard', auth: true },
  { path: ROUTES.CONVERT_DOWNLOADS_JOB, component: DownloadCenterPage, layout: 'dashboard', auth: true },
  { path: ROUTES.UPLOAD, component: UploadPage, layout: 'dashboard', auth: true },
  { path: ROUTES.HISTORY, component: HistoryDashboardPage, layout: 'dashboard', auth: true },
  { path: ROUTES.HISTORY_ALL, component: UnifiedHistoryPage, layout: 'dashboard', auth: true },
  { path: ROUTES.HISTORY_JOB, component: HistoryJobDetailsPage, layout: 'dashboard', auth: true },
  { path: ROUTES.HISTORY_DOWNLOADS, component: HistoryDownloadCenterPage, layout: 'dashboard', auth: true },
  { path: ROUTES.HISTORY_REPORTS, component: ReportsPage, layout: 'dashboard', auth: true },
  { path: ROUTES.HISTORY_AUDIT, component: AuditLogsPage, layout: 'dashboard', auth: true },
  { path: ROUTES.DOWNLOADS, component: HistoryDownloadCenterPage, layout: 'dashboard', auth: true },
  { path: ROUTES.NOTIFICATIONS, component: NotificationsPage, layout: 'dashboard', auth: true },
  { path: ROUTES.ACTIVITY, component: UnifiedHistoryPage, layout: 'dashboard', auth: true },
  { path: ROUTES.PROFILE, component: ProfilePage, layout: 'dashboard', auth: true },
  { path: ROUTES.SETTINGS, component: SettingsDashboardPage, layout: 'dashboard', auth: true },
  { path: ROUTES.SETTINGS_PROFILE, component: SettingsProfilePage, layout: 'dashboard', auth: true },
  { path: ROUTES.SETTINGS_SECURITY, component: SettingsSecurityPage, layout: 'dashboard', auth: true },
  { path: ROUTES.SETTINGS_CONNECTED_ACCOUNTS, component: SettingsConnectedAccountsPage, layout: 'dashboard', auth: true },
  { path: ROUTES.SETTINGS_API_KEYS, component: SettingsApiKeysPage, layout: 'dashboard', auth: true },
  { path: ROUTES.SETTINGS_NOTIFICATIONS, component: SettingsNotificationsPage, layout: 'dashboard', auth: true },
  { path: ROUTES.SETTINGS_APPEARANCE, component: SettingsAppearancePage, layout: 'dashboard', auth: true },
  { path: ROUTES.SETTINGS_LANGUAGE, component: SettingsLanguagePage, layout: 'dashboard', auth: true },
  { path: ROUTES.SETTINGS_PRIVACY, component: SettingsPrivacyPage, layout: 'dashboard', auth: true },
  { path: ROUTES.SETTINGS_ACCOUNT, component: SettingsAccountPage, layout: 'dashboard', auth: true },
  { path: ROUTES.SETTINGS_ACTIVITY, component: SettingsActivityPage, layout: 'dashboard', auth: true },
  { path: ROUTES.BILLING, component: BillingDashboardPage, layout: 'dashboard', auth: true },
  { path: ROUTES.BILLING_PRICING, component: BillingPricingPage, layout: 'dashboard', auth: true },
  { path: ROUTES.BILLING_SUBSCRIPTION, component: BillingSubscriptionPage, layout: 'dashboard', auth: true },
  { path: ROUTES.BILLING_LICENSE, component: BillingLicensePage, layout: 'dashboard', auth: true },
  { path: ROUTES.BILLING_CHECKOUT, component: BillingCheckoutPage, layout: 'dashboard', auth: true },
  { path: ROUTES.BILLING_PAYMENT_METHODS, component: BillingPaymentMethodsPage, layout: 'dashboard', auth: true },
  { path: ROUTES.BILLING_INVOICES, component: BillingInvoicesPage, layout: 'dashboard', auth: true },
  { path: ROUTES.BILLING_HISTORY, component: BillingHistoryPage, layout: 'dashboard', auth: true },
  { path: ROUTES.BILLING_USAGE, component: BillingUsagePage, layout: 'dashboard', auth: true },
  { path: ROUTES.API_KEYS, component: ApiKeysPage, layout: 'dashboard', auth: true },
  { path: ROUTES.LICENSE, component: LicensePage, layout: 'dashboard', auth: true },
  { path: ROUTES.SUPPORT, component: SupportPage, layout: 'dashboard', auth: true },
]

// ─── Admin Routes ─────────────────────────────────────────────────────────────
export const adminRoutes: RouteConfig[] = [
  { path: ROUTES.ADMIN, component: AdminOverviewPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_USERS, component: AdminUserManagementPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_USER_DETAIL, component: AdminUserDetailPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_SUBSCRIPTIONS, component: AdminSubscriptionPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_LICENSES, component: AdminOverviewPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_PAYMENTS, component: AdminPaymentPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_JOBS, component: AdminJobMonitoringPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_SUPPORT, component: AdminSupportCenterPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_SUPPORT_TICKET, component: AdminTicketDetailsPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_ANALYTICS, component: AdminAnalyticsPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_MONITORING, component: AdminSystemMonitoringPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_AUDIT, component: AdminAuditLogsPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_NOTIFICATIONS, component: AdminNotificationsPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_SETTINGS, component: AdminSettingsPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_ROLES, component: AdminRolesPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_ERRORS, component: AdminErrorsPage, layout: 'admin', auth: true, adminOnly: true },
  { path: ROUTES.ADMIN_LOGS, component: AdminAuditLogsPage, layout: 'admin', auth: true, adminOnly: true },
]

// ─── All Routes ───────────────────────────────────────────────────────────────
export const allRoutes: RouteConfig[] = [
  ...publicRoutes,
  ...authRoutes,
  ...dashboardRoutes,
  ...adminRoutes,
]
