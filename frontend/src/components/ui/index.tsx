import { getStatusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

export function Badge({ children, variant = 'neutral', size = 'md', dot = false, className }: BadgeProps) {
  return (
    <span className={cn(`badge badge-${variant}`, size === 'sm' && 'text-xs py-0.5 px-2', className)}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current`} />}
      {children}
    </span>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string
  dot?: boolean
}

export function StatusBadge({ status, dot = true }: StatusBadgeProps) {
  const variant = getStatusColor(status) as BadgeProps['variant']
  return (
    <Badge variant={variant} dot={dot}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showPercent?: boolean
  color?: 'brand' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const progressColors = {
  brand: 'linear-gradient(90deg, #08619d, #009688)',
  success: 'linear-gradient(90deg, #009688, #2dd4bf)',
  warning: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
  danger: 'linear-gradient(90deg, #ef4444, #f87171)',
}

const progressHeights = { sm: 4, md: 6, lg: 8 }

export function ProgressBar({ value, max = 100, label, showPercent = false, color = 'brand', size = 'md' }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-slate-400">{label}</span>}
          {showPercent && <span className="text-xs font-semibold text-slate-300">{Math.round(percent)}%</span>}
        </div>
      )}
      <div
        className="progress-bar overflow-hidden"
        style={{ height: progressHeights[size] }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemax={max}
      >
        <div
          className="progress-bar-fill"
          style={{ width: `${percent}%`, background: progressColors[color] }}
        />
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
interface SkeletonProps {
  className?: string
  count?: number
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('skeleton', className)} />
      ))}
    </>
  )
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-300 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-xs mb-6">{description}</p>}
      {action}
    </div>
  )
}

// ─── Error State ──────────────────────────────────────────────────────────────
interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 mb-4 text-2xl">
        ⚠️
      </div>
      <h3 className="text-base font-semibold text-slate-300 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-xs mb-6">{description}</p>}
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary btn-sm">
          Try Again
        </button>
      )}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  color?: 'brand' | 'success' | 'warning' | 'danger'
}

const trendColors = { brand: '#0a7bc2', success: '#2dd4bf', warning: '#fbbf24', danger: '#f87171' }

export function StatCard({ title, value, subtitle, icon, trend, color = 'brand' }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${trendColors[color]}18`, color: trendColors[color] }}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className="text-xs font-semibold"
            style={{ color: trend.value >= 0 ? '#2dd4bf' : '#f87171' }}
          >
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-slate-500">{trend.label}</span>
        </div>
      )}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number
  totalPages: number
  onNext: () => void
  onPrev: () => void
  onGoTo: (page: number) => void
}

export function Pagination({ page, totalPages, onNext, onPrev, onGoTo }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1
    if (i === 0) return 1
    if (i === 6) return totalPages
    if (page <= 4) return i + 1
    if (page >= totalPages - 3) return totalPages - 6 + i
    return page - 3 + i
  })

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button onClick={onPrev} disabled={page === 1} className="btn-ghost btn-sm disabled:opacity-40">
        ←
      </button>
      {pages.map((p, i) => (
        <button
          key={i}
          onClick={() => onGoTo(p)}
          className={cn(
            'w-8 h-8 text-sm rounded-lg transition-all',
            page === p
              ? 'bg-brand-500 text-white font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          )}
        >
          {p}
        </button>
      ))}
      <button onClick={onNext} disabled={page === totalPages} className="btn-ghost btn-sm disabled:opacity-40">
        →
      </button>
    </div>
  )
}
