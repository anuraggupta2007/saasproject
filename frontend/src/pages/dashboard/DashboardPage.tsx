import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FolderArchive, RefreshCw, HardDrive, Activity, ArrowUpRight,
  Plus, Clock, CheckCircle, AlertCircle, Loader, TrendingUp
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { analyticsApi } from '@/api/index'
import { StatCard, StatusBadge, ProgressBar, SkeletonCard } from '@/design-system'
import { formatRelativeTime, formatBytes } from '@/utils/format'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
}

const quickActions = [
  { label: 'New Backup', href: '/dashboard/backup', icon: FolderArchive, color: '#6366f1' },
  { label: 'Convert File', href: '/dashboard/convert', icon: RefreshCw, color: '#8b5cf6' },
  { label: 'Upload File', href: '/dashboard/upload', icon: Plus, color: '#10b981' },
  { label: 'View Downloads', href: '/dashboard/downloads', icon: HardDrive, color: '#f59e0b' },
]

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => analyticsApi.getDashboard().then((r) => r.data),
    staleTime: 60_000,
  })

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => analyticsApi.getActivity({ limit: 8 }).then((r) => r.data),
    staleTime: 30_000,
  })

  // Fallback demo stats when API is not yet connected
  const demoStats = {
    total_backups: 24,
    total_conversions: 138,
    storage_used: 2_684_354_560,
    storage_limit: 10_737_418_240,
    emails_backed_up: 48_523,
    active_accounts: 3,
    recent_jobs: [
      { id: '1', type: 'backup', name: 'Gmail - Inbox', status: 'completed', created_at: new Date(Date.now() - 3_600_000).toISOString() },
      { id: '2', type: 'conversion', name: 'archive.pst → MBOX', status: 'running', created_at: new Date(Date.now() - 900_000).toISOString() },
      { id: '3', type: 'backup', name: 'Outlook - Work', status: 'pending', created_at: new Date(Date.now() - 7_200_000).toISOString() },
      { id: '4', type: 'conversion', name: 'emails.mbox → EML', status: 'completed', created_at: new Date(Date.now() - 86_400_000).toISOString() },
    ],
  }

  const s = stats || demoStats

  return (
    <div className="space-y-7 max-w-7xl">
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
            <span className="gradient-brand-text">{user?.full_name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">Here's what's happening with your emails.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/backup" className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> New Backup
          </Link>
          <Link to="/dashboard/convert" className="btn-secondary btn-sm">
            <RefreshCw className="w-4 h-4" /> Convert
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
              <StatCard
                title="Total Backups"
                value={s.total_backups}
                subtitle="All time"
                icon={<FolderArchive className="w-5 h-5" />}
                trend={{ value: 12, label: 'this month' }}
                color="brand"
              />
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
              <StatCard
                title="Conversions"
                value={s.total_conversions}
                subtitle="Files converted"
                icon={<RefreshCw className="w-5 h-5" />}
                trend={{ value: 8, label: 'this week' }}
                color="brand"
              />
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
              <StatCard
                title="Emails Saved"
                value={s.emails_backed_up?.toLocaleString() || '0'}
                subtitle="Across all accounts"
                icon={<TrendingUp className="w-5 h-5" />}
                color="success"
              />
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
              <StatCard
                title="Connected Accounts"
                value={s.active_accounts || 0}
                subtitle="Email providers"
                icon={<Activity className="w-5 h-5" />}
                color="brand"
              />
            </motion.div>
          </>
        )}
      </div>

      {/* Storage Usage */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4} className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white">Storage Usage</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatBytes(s.storage_used)} of {formatBytes(s.storage_limit)} used
            </p>
          </div>
          <Link to="/dashboard/billing" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            Upgrade <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <ProgressBar
          value={s.storage_used}
          max={s.storage_limit}
          showPercent
          color={s.storage_used / s.storage_limit > 0.8 ? 'warning' : 'brand'}
          size="lg"
        />
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5} className="card">
          <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 transition-all group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: `${action.color}18`, color: action.color }}
                >
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-300 text-center">{action.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent Jobs */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6} className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Recent Jobs</h3>
            <Link to="/dashboard/backup" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton w-9 h-9 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-4 w-40" />
                    <div className="skeleton h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(activity?.items || s.recent_jobs).map((job: any) => (
                <div key={job.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/3 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    job.status === 'completed' ? 'bg-accent-500/15' :
                    job.status === 'running' ? 'bg-brand-500/15' :
                    job.status === 'failed' ? 'bg-red-500/15' : 'bg-white/5'
                  }`}>
                    {job.status === 'completed' && <CheckCircle className="w-4 h-4 text-accent-400" />}
                    {job.status === 'running' && <Loader className="w-4 h-4 text-brand-400 animate-spin" />}
                    {job.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-400" />}
                    {job.status === 'pending' && <Clock className="w-4 h-4 text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{job.name}</p>
                    <p className="text-xs text-slate-500">{formatRelativeTime(job.created_at)}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Plan Banner */}
      {user?.plan === 'free' && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={7}
          className="relative overflow-hidden rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <div className="absolute right-0 top-0 w-48 h-48 bg-brand-500/10 rounded-full blur-[60px] pointer-events-none" />
          <div className="relative z-10">
            <h3 className="font-bold text-white mb-1">Upgrade to Starter Plan</h3>
            <p className="text-sm text-slate-400">Get 3 accounts, 25 GB storage, and unlimited conversions.</p>
          </div>
          <Link to="/dashboard/billing" className="btn-primary btn-sm shrink-0 relative z-10">
            Upgrade Now <ArrowUpRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}
    </div>
  )
}
