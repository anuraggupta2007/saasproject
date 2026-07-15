import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Inbox,
  AlertCircle,
  Loader2,
  Mail,
  Shield,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

interface Notification {
  id: string
  title: string
  message: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  time: string
  read: boolean
  type: 'info' | 'success' | 'warning' | 'error'
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Backup Complete',
    message: 'Your email backup for Gmail finished successfully. 2,847 emails archived.',
    icon: CheckCheck,
    iconColor: 'text-emerald-400',
    time: '2 min ago',
    read: false,
    type: 'success',
  },
  {
    id: '2',
    title: 'Storage Warning',
    message: 'You have used 85% of your backup storage. Consider upgrading your plan.',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    time: '15 min ago',
    read: false,
    type: 'warning',
  },
  {
    id: '3',
    title: 'New Feature: Email Converter',
    message: 'Convert your emails between formats with our new converter tool.',
    icon: Mail,
    iconColor: 'text-brand-400',
    time: '1 hour ago',
    read: false,
    type: 'info',
  },
  {
    id: '4',
    title: 'Security Alert',
    message: 'A new device signed into your account from San Francisco, CA.',
    icon: Shield,
    iconColor: 'text-red-400',
    time: '3 hours ago',
    read: true,
    type: 'error',
  },
  {
    id: '5',
    title: 'Scheduled Backup',
    message: 'Your weekly backup is scheduled for tomorrow at 2:00 AM UTC.',
    icon: Info,
    iconColor: 'text-blue-400',
    time: '5 hours ago',
    read: true,
    type: 'info',
  },
  {
    id: '6',
    title: 'Export Ready',
    message: 'Your MBOX export file is ready for download. It expires in 24 hours.',
    icon: Bell,
    iconColor: 'text-violet-400',
    time: '1 day ago',
    read: true,
    type: 'info',
  },
]

const panelVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring' as const, damping: 30, stiffness: 300 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.2 } },
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, type: 'spring' as const, damping: 25, stiffness: 200 },
  }),
}

const typeColors: Record<Notification['type'], string> = {
  info: 'bg-blue-500/10',
  success: 'bg-emerald-500/10',
  warning: 'bg-amber-500/10',
  error: 'bg-red-500/10',
}

function NotificationItem({
  notification,
  index,
  onMarkRead,
  onDelete,
}: {
  notification: Notification
  index: number
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [dragging, setDragging] = useState(false)

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -80) {
      onDelete(notification.id)
    }
    setDragging(false)
  }

  return (
    <motion.div
      custom={index}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.3}
      onDragStart={() => setDragging(true)}
      onDragEnd={handleDragEnd}
      className={`group relative ${dragging ? 'z-10' : ''}`}
    >
      <button
        onClick={() => !notification.read && onMarkRead(notification.id)}
        className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 border border-transparent ${
          notification.read
            ? 'hover:bg-white/[0.02] hover:border-white/5'
            : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/5'
        }`}
        aria-label={`Notification: ${notification.title}. ${notification.read ? 'Read' : 'Unread'}`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${typeColors[notification.type]}`}
          >
            <notification.icon className={`w-4.5 h-4.5 ${notification.iconColor}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {!notification.read && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
              )}
              <p
                className={`text-sm font-medium truncate ${
                  notification.read ? 'text-slate-400' : 'text-white'
                }`}
              >
                {notification.title}
              </p>
            </div>
            <p
              className={`text-xs leading-relaxed line-clamp-2 ${
                notification.read ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              {notification.message}
            </p>
            <p className="text-[11px] text-slate-600 mt-1.5">{notification.time}</p>
          </div>

          {/* Delete button (visible on hover) */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(notification.id)
            }}
            className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
            aria-label={`Delete notification: ${notification.title}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </button>
    </motion.div>
  )
}

function SkeletonItem({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.1 }}
      className="p-3.5"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/5 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-white/5 rounded w-2/3 animate-pulse" />
          <div className="h-3 bg-white/[0.03] rounded w-full animate-pulse" />
          <div className="h-3 bg-white/[0.03] rounded w-1/3 animate-pulse" />
        </div>
      </div>
    </motion.div>
  )
}

export function NotificationPanel() {
  const { notificationPanelOpen, setNotificationPanelOpen } = useUIStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Simulate loading
  useEffect(() => {
    if (notificationPanelOpen) {
      setLoading(true)
      setError(null)
      const timer = setTimeout(() => {
        setNotifications(mockNotifications)
        setLoading(false)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [notificationPanelOpen])

  // Focus trap & escape key
  useEffect(() => {
    if (notificationPanelOpen) {
      closeButtonRef.current?.focus()

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setNotificationPanelOpen(false)
      }
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [notificationPanelOpen, setNotificationPanelOpen])

  // Lock body scroll
  useEffect(() => {
    if (notificationPanelOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [notificationPanelOpen])

  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const handleDelete = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return (
    <AnimatePresence>
      {notificationPanelOpen && (
        <>
          {/* Overlay */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setNotificationPanelOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-surface-900 border-l border-white/5 shadow-2xl shadow-black/40 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-brand-500/20 text-brand-400 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-all"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  ref={closeButtonRef}
                  onClick={() => setNotificationPanelOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {/* Loading State */}
              {loading && (
                <div className="divide-y divide-white/5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonItem key={i} index={i} />
                  ))}
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
                <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">Something went wrong</p>
                  <p className="text-xs text-slate-500 mb-4">{error}</p>
                  <button
                    onClick={() => {
                      setError(null)
                      setLoading(true)
                      setTimeout(() => {
                        setNotifications(mockNotifications)
                        setLoading(false)
                      }, 800)
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-brand-400 hover:bg-brand-500/10 rounded-lg transition-all"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <Inbox className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">No notifications</p>
                  <p className="text-xs text-slate-500">
                    You're all caught up. New notifications will appear here.
                  </p>
                </div>
              )}

              {/* Notification List */}
              {!loading && !error && notifications.length > 0 && (
                <div className="p-2 space-y-0.5">
                  <AnimatePresence mode="popLayout">
                    {notifications.map((notification, i) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        index={i}
                        onMarkRead={handleMarkRead}
                        onDelete={handleDelete}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {!loading && notifications.length > 0 && (
              <div className="px-5 py-3 border-t border-white/5 shrink-0">
                <p className="text-[11px] text-slate-600 text-center">
                  Swipe left to delete &middot; Click to mark as read
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function NotificationBell() {
  const { notificationPanelOpen, setNotificationPanelOpen } = useUIStore()
  const [unreadCount] = useState(3) // Mock unread count

  return (
    <button
      onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
      className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
      aria-label={`Notifications. ${unreadCount} unread.`}
      aria-expanded={notificationPanelOpen}
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </motion.span>
      )}
    </button>
  )
}
