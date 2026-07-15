import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Search, Shield, RefreshCw, Calendar } from 'lucide-react'
import { StatusBadge, Pagination, Skeleton, Select } from '@/design-system'
import { formatDateTime, formatBytes } from '@/utils/format'
import apiClient from '@/lib/apiClient'

interface HistoryItem {
  id: string
  type: 'backup' | 'conversion'
  name: string
  status: string
  size?: number
  created_at: string
  details?: string
}

export default function HistoryPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery<{ items: HistoryItem[]; total: number }>({
    queryKey: ['history', search, typeFilter, page],
    queryFn: () =>
      apiClient
        .get('/api/v1/analytics/activity', {
          params: { page, limit: 10, type: typeFilter !== 'all' ? typeFilter : undefined, search }
        })
        .then((r) => r.data),
  })

  // Demo Fallback
  const demoItems: HistoryItem[] = [
    { id: '1', type: 'backup', name: 'Gmail - Inbox sync', status: 'completed', created_at: new Date(Date.now() - 3600000).toISOString(), size: 1048576 * 12, details: 'Synced 120 messages' },
    { id: '2', type: 'conversion', name: 'my_archive.pst → MBOX', status: 'completed', created_at: new Date(Date.now() - 3600000 * 3).toISOString(), size: 1048576 * 128, details: 'Converted 4850 emails' },
    { id: '3', type: 'backup', name: 'Work Outlook Sync', status: 'failed', created_at: new Date(Date.now() - 86400000).toISOString(), details: 'Authentication failed' },
    { id: '4', type: 'conversion', name: 'inbox.mbox → EML', status: 'completed', created_at: new Date(Date.now() - 86400000 * 2).toISOString(), size: 1048576 * 85, details: 'Converted 1204 emails' }
  ]

  const items = data?.items || demoItems
  const total = data?.total || demoItems.length
  const totalPages = Math.ceil(total / 10)

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Activity History</h1>
        <p className="text-slate-500 text-sm">View details of all your backup jobs and email conversion activities</p>
      </div>

      {/* Filters */}
      <div className="card flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/5 px-3 py-2 w-full md:max-w-xs">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none w-full"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select
            options={[
              { value: 'all', label: 'All Activities' },
              { value: 'backup', label: 'Backups Only' },
              { value: 'conversion', label: 'Conversions Only' }
            ]}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="!py-2 w-full md:w-48"
          />
        </div>
      </div>

      {/* List */}
      <div className="card space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" count={5} />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-slate-500">No activity history found.</div>
        ) : (
          <div className="divide-y divide-white/5 space-y-4">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.04 }}
                className="flex items-start justify-between gap-4 pt-4 first:pt-0"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === 'backup' ? 'bg-brand-500/10 text-brand-400' : 'bg-purple-500/10 text-purple-400'
                  }`}>
                    {item.type === 'backup' ? <Shield className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDateTime(item.created_at)}</span>
                      {item.size && <span>· {formatBytes(item.size)}</span>}
                      {item.details && <span>· {item.details}</span>}
                    </div>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pt-4 border-t border-white/5 flex justify-center">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
