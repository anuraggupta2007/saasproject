import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface TableSkeletonProps {
  rows?: number
  className?: string
}

export function TableSkeleton({ rows = 5, className }: TableSkeletonProps) {
  return (
    <div className={cn('w-full space-y-3', className)}>
      <div className="h-10 bg-white/5 rounded-xl border border-white/5 animate-shimmer" />

      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="h-14 bg-white/5 rounded-xl border border-white/5 animate-shimmer flex items-center px-4 gap-4"
        >
          <div className="h-4 w-4 bg-white/10 rounded animate-shimmer" />
          <div className="h-4 flex-1 bg-white/10 rounded animate-shimmer" />
          <div className="h-4 w-24 bg-white/10 rounded animate-shimmer hidden sm:block" />
          <div className="h-4 w-20 bg-white/10 rounded animate-shimmer hidden md:block" />
          <div className="h-6 w-16 bg-white/10 rounded-full animate-shimmer" />
        </motion.div>
      ))}
    </div>
  )
}
