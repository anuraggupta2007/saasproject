import { lazy, Suspense, Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { ROUTES } from '@/routes/constants'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, background: '#1e1e30', color: '#e2e8f0', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#ef4444', fontSize: 20 }}>React Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#f87171' }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#94a3b8', fontSize: 12, marginTop: 16 }}>{this.state.error.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center animated-gradient-bg">
    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

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
  import('@/pages/auth/PasswordPages').then((m) => ({ default: m.ForgotPasswordPage }))
)
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/PasswordPages').then((m) => ({ default: m.ResetPasswordPage }))
)
const EmailVerificationPage = lazy(() =>
  import('@/pages/auth/PasswordPages').then((m) => ({ default: m.EmailVerificationPage }))
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

const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))

const NotFoundPage = lazy(() => import('@/pages/error/NotFoundPage'))
const ForbiddenPage = lazy(() => import('@/pages/error/ForbiddenPage'))
const ServerErrorPage = lazy(() => import('@/pages/error/ServerErrorPage'))
const MaintenancePage = lazy(() => import('@/pages/error/MaintenancePage'))

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path={ROUTES.HOME} element={<HomePage />} />
            <Route path={ROUTES.FEATURES} element={<FeaturesPage />} />
            <Route path={ROUTES.PRICING} element={<PricingPage />} />
            <Route path={ROUTES.DOWNLOAD} element={<DownloadPage />} />
            <Route path={ROUTES.BLOG} element={<BlogPage />} />
            <Route path={ROUTES.DOCS} element={<DocsPage />} />
            <Route path={ROUTES.FAQ} element={<FaqPage />} />
            <Route path={ROUTES.CONTACT} element={<ContactPage />} />
            <Route path={ROUTES.ABOUT} element={<AboutPage />} />
            <Route path={ROUTES.PRIVACY} element={<PrivacyPage />} />
            <Route path={ROUTES.TERMS} element={<TermsPage />} />
          </Route>

          {/* Guest Auth Routes */}
          <Route element={<GuestRoute><AuthLayout /></GuestRoute>}>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
          </Route>
          <Route path={ROUTES.VERIFY_EMAIL} element={<AuthLayout />}>
            <Route index element={<EmailVerificationPage />} />
          </Route>

          {/* User Dashboard Protected Routes */}
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="backup" element={<BackupJobsPage />} />
            <Route path="convert" element={<ConvertPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="backup-history" element={<HistoryPage />} />
            <Route path="conversion-history" element={<HistoryPage />} />
            <Route path="downloads" element={<DownloadsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="activity" element={<HistoryPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="license" element={<LicensePage />} />
            <Route path="support" element={<SupportPage />} />
          </Route>

          {/* Admin Dashboard Protected Routes */}
          <Route
            path={ROUTES.ADMIN}
            element={
              <ProtectedRoute adminOnly>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminDashboardPage />} />
            <Route path="licenses" element={<AdminDashboardPage />} />
            <Route path="payments" element={<AdminDashboardPage />} />
            <Route path="support" element={<AdminDashboardPage />} />
            <Route path="logs" element={<AdminDashboardPage />} />
            <Route path="monitoring" element={<AdminDashboardPage />} />
          </Route>

          {/* Error Pages */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/500" element={<ServerErrorPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />

          {/* Catch-all Redirect */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
