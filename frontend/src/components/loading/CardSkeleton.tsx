import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface CardSkeletonProps {
  count?: number
  className?: string
}

export function CardSkeleton({ count = 3, className }: CardSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 animate-shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-white/10 rounded animate-shimmer" />
                <div className="h-3 w-20 bg-white/10 rounded animate-shimmer" />
              </div>
            </div>
            <div className="h-3 w-full bg-white/10 rounded animate-shimmer" />
            <div className="h-3 w-3/4 bg-white/10 rounded animate-shimmer" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
