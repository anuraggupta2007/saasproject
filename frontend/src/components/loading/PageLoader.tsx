import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'

interface PageLoaderProps {
  message?: string
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-500/25"
        >
          <Mail className="w-7 h-7 text-white" />
        </motion.div>
        <p className="text-sm text-slate-400 font-medium">{message}</p>
      </motion.div>
    </div>
  )
}
