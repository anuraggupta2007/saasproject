import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react'

interface SessionExpiredModalProps {
  isOpen: boolean
  onRefresh: () => void
  onLogout: () => void
  isRefreshing?: boolean
}

export function SessionExpiredModal({
  isOpen,
  onRefresh,
  onLogout,
  isRefreshing = false,
}: SessionExpiredModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-surface-800 p-6 shadow-2xl"
          >
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Session Expired</h2>
              <p className="text-sm text-slate-400 mb-6">
                Your session has expired. Would you like to refresh or sign in again?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onLogout}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-sm font-medium text-white hover:bg-brand-600 transition-all disabled:opacity-50"
                >
                  {isRefreshing ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Refresh
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
