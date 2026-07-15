import React from 'react'
import { cn } from '@/utils/cn'

const colorMap = {
  brand: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400' },
  success: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400' },
  danger: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400' },
}

export interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  color?: 'brand' | 'success' | 'warning' | 'danger'
  className?: string
}

export function StatCard({ title, value, subtitle, icon, trend, color = 'brand', className }: StatCardProps) {
  const colors = colorMap[color]
  return (
    <div className={cn('rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm', className)}>
      <div className="mb-3 flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {icon && (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', colors.bg, colors.text)}>
            {icon}
          </div>
        )}
      </div>
      <p className="mb-1 text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={cn('text-xs font-semibold', trend.value >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {trend.value >= 0 ? '\u2191' : '\u2193'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-slate-500">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
