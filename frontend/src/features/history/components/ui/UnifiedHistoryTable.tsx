import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import type { UnifiedJob, JobStatus, JobType } from '../../types';

interface UnifiedHistoryTableProps {
  items: UnifiedJob[];
  isLoading?: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  selectedIds: Set<string>;
  onSort: (key: string) => void;
  onSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onViewDetails: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

function getStatusColor(status: JobStatus): string {
  const colors: Record<string, string> = {
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    completed_with_errors: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    failed: 'bg-red-500/15 text-red-400 border-red-500/30',
    cancelled: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    running: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    converting: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    paused: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    pending: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    queued: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    retrying: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    uploading: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    validating: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    processing: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    compressing: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };
  return colors[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
}

function getJobTypeColor(type: JobType): string {
  const colors: Record<string, string> = {
    backup: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    conversion: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    scheduled: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };
  return colors[type] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
}

export const UnifiedHistoryTable = memo(
  forwardRef<HTMLDivElement, UnifiedHistoryTableProps>(
    ({ items, isLoading, sortBy, sortOrder, selectedIds, onSort, onSelect, onSelectAll, onViewDetails, onDelete, onRetry, className }, ref) => {
      const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

      return (
        <div ref={ref} className={cn('overflow-x-auto', className)}>
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll(e.target.checked ? items.map((i) => i.id) : [])}
                    className="w-4 h-4 rounded border-white/20 text-brand-500 focus:ring-brand-500"
                  />
                </th>
                {[
                  { key: 'jobId', label: 'Job ID', sortable: true, width: 'w-24' },
                  { key: 'jobType', label: 'Type', sortable: true, width: 'w-20' },
                  { key: 'name', label: 'Name', sortable: true },
                  { key: 'accountEmail', label: 'Account', sortable: true },
                  { key: 'status', label: 'Status', sortable: true, width: 'w-28' },
                  { key: 'startedAt', label: 'Started', sortable: true, width: 'w-28' },
                  { key: 'duration', label: 'Duration', sortable: true, width: 'w-20' },
                  { key: 'totalSize', label: 'Size', sortable: true, width: 'w-20' },
                  { key: 'emailCount', label: 'Emails', sortable: true, width: 'w-20' },
                  { key: 'actions', label: '', sortable: false, width: 'w-24' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider',
                      col.width,
                      col.sortable && 'cursor-pointer hover:text-white'
                    )}
                    onClick={col.sortable ? () => onSort(col.key) : undefined}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortBy === col.key && (
                        <span className="text-brand-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-4" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-12" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-32" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-8" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <p className="text-slate-400">No jobs found</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <motion.tr
                    key={item.id}
                    className={cn(
                      'hover:bg-white/5 transition-colors',
                      selectedIds.has(item.id) && 'bg-brand-500/5'
                    )}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => onSelect(item.id)}
                        className="w-4 h-4 rounded border-white/20 text-brand-500 focus:ring-brand-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-400">{item.jobId.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 text-xs rounded-full font-medium border', getJobTypeColor(item.jobType))}>
                        {item.jobType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white truncate max-w-[200px]">{item.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-300 truncate max-w-[150px] block">{item.accountEmail || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border', getStatusColor(item.status))}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{formatRelativeTime(item.startedAt)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-300">{item.duration ? formatDuration(item.duration) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{formatBytes(item.totalSize)}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{item.emailCount?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onViewDetails(item.id)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors text-xs"
                        >
                          View
                        </button>
                        {item.status === 'failed' && (
                          <button
                            onClick={() => onRetry(item.id)}
                            className="p-1.5 text-slate-400 hover:text-brand-400 rounded-lg hover:bg-white/10 transition-colors text-xs"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      );
    }
  )
);

UnifiedHistoryTable.displayName = 'UnifiedHistoryTable';
