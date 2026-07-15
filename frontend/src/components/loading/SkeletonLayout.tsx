import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface SkeletonLayoutProps {
  className?: string
}

export function SkeletonLayout({ className }: SkeletonLayoutProps) {
  return (
    <div className={cn('flex h-screen bg-surface-900 overflow-hidden', className)}>
      <div className="hidden lg:flex flex-col w-64 bg-surface-800 border-r border-white/5 p-4 space-y-3">
        <div className="h-8 w-32 bg-white/5 rounded-lg animate-shimmer" />
        <div className="space-y-2 mt-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="h-9 bg-white/5 rounded-lg animate-shimmer"
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 border-b border-white/5 bg-surface-800/50 backdrop-blur-sm flex items-center justify-between px-6">
          <div className="h-9 w-64 bg-white/5 rounded-xl animate-shimmer" />
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-white/5 rounded-lg animate-shimmer" />
            <div className="h-9 w-32 bg-white/5 rounded-xl animate-shimmer" />
          </div>
        </div>

        <div className="flex-1 p-6 space-y-6">
          <div className="h-8 w-48 bg-white/5 rounded-lg animate-shimmer" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="h-28 bg-white/5 rounded-xl border border-white/5 animate-shimmer"
              />
            ))}
          </div>
          <div className="h-64 bg-white/5 rounded-xl border border-white/5 animate-shimmer" />
        </div>
      </div>
    </div>
  )
}
