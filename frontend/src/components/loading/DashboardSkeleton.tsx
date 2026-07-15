import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface DashboardSkeletonProps {
  className?: string
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div className={cn('flex h-screen bg-surface-900 overflow-hidden', className)}>
      <div className="hidden lg:flex flex-col w-64 bg-surface-800 border-r border-white/5">
        <div className="h-16 flex items-center gap-2.5 px-4 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-white/10 animate-shimmer" />
          <div className="h-4 w-24 bg-white/10 rounded animate-shimmer" />
        </div>

        <div className="flex-1 p-3 space-y-4">
          <div className="space-y-1.5">
            <div className="h-3 w-16 bg-white/5 rounded animate-shimmer px-3" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 bg-white/5 rounded-lg animate-shimmer" />
            ))}
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-16 bg-white/5 rounded animate-shimmer px-3" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 bg-white/5 rounded-lg animate-shimmer" />
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-white/5">
          <div className="h-12 bg-white/5 rounded-xl animate-shimmer" />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 border-b border-white/5 bg-surface-800/50 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="lg:hidden h-9 w-9 bg-white/5 rounded-lg animate-shimmer" />
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5 w-64">
              <div className="h-4 w-4 bg-white/10 rounded animate-shimmer" />
              <div className="h-4 flex-1 bg-white/10 rounded animate-shimmer" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-white/5 rounded-lg animate-shimmer" />
            <div className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1.5">
              <div className="h-7 w-7 bg-white/10 rounded-lg animate-shimmer" />
              <div className="space-y-1">
                <div className="h-3 w-20 bg-white/10 rounded animate-shimmer" />
                <div className="h-2.5 w-12 bg-white/10 rounded animate-shimmer" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-hidden">
          <div className="h-8 w-48 bg-white/5 rounded-lg animate-shimmer" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-white/10 rounded animate-shimmer" />
                    <div className="h-8 w-8 bg-white/10 rounded-lg animate-shimmer" />
                  </div>
                  <div className="h-7 w-20 bg-white/10 rounded animate-shimmer" />
                  <div className="h-3 w-32 bg-white/10 rounded animate-shimmer" />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div className="h-5 w-32 bg-white/10 rounded animate-shimmer mb-4" />
              <div className="h-48 bg-white/5 rounded-lg animate-shimmer" />
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div className="h-5 w-32 bg-white/10 rounded animate-shimmer mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-white/5 rounded-lg animate-shimmer" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
