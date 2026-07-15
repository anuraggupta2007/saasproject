import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, BellOff, Loader, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import apiClient from '@/lib/apiClient'
import { formatRelativeTime } from '@/utils/format'

interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const qc = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get('/api/v1/notifications/').then((r) => r.data.items || r.data),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/api/v1/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.post('/api/v1/notifications/read-all'),
    onSuccess: () => {
      toast.success('All notifications marked as read')
      qc.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  // Demo Fallback
  const demoNotifications: Notification[] = [
    { id: '1', title: 'Backup sync completed', message: 'Your daily backup for user@gmail.com completed successfully. 120 new emails archived.', read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: '2', title: 'PST conversion ready', message: 'Your PST conversion job #1483 is complete. You can download the MBOX output now.', read: false, created_at: new Date(Date.now() - 3600000 * 3).toISOString() },
    { id: '3', title: 'Welcome to MailSavior', message: 'Thanks for signing up! Connect your first email account to start backing up.', read: true, created_at: new Date(Date.now() - 86400000).toISOString() }
  ]

  const items = notifications.length > 0 ? notifications : demoNotifications
  const unreadCount = items.filter((n) => !n.read).length

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">Stay updated with system tasks and job completions</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="btn-secondary btn-sm"
          >
            <Check className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader className="w-8 h-8 text-brand-500 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
            <BellOff className="w-12 h-12 mb-4" />
            <p>You have no notifications.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`card flex gap-4 relative transition-all ${
                !item.read ? 'border-brand-500/20 bg-brand-500/3' : 'border-white/5 bg-surface-800/40 opacity-70'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                !item.read ? 'bg-brand-500/10 text-brand-400' : 'bg-white/5 text-slate-500'
              }`}>
                <Bell className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <h3 className={`text-sm font-semibold text-white ${!item.read ? '' : 'text-slate-300'}`}>
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.message}</p>
                <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {formatRelativeTime(item.created_at)}
                </p>
              </div>

              {!item.read && (
                <button
                  onClick={() => markReadMutation.mutate(item.id)}
                  className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-brand-500/20 hover:text-brand-400 text-slate-500 transition-all"
                  title="Mark as read"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
