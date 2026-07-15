import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { FileArchive, CheckCircle, AlertCircle, Loader2, Clock, Download, Eye } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ConversionHistoryItem, ConversionStatus } from '../../types';

interface HistoryTableProps {
  items: ConversionHistoryItem[];
  isLoading?: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
  onViewDetails: (id: string) => void;
  onDownload: (id: string) => void;
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

function getStatusColor(status: ConversionStatus): string {
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

function getStatusLabel(status: ConversionStatus): string {
  const labels: Record<string, string> = {
    completed: 'Completed',
    completed_with_errors: 'Completed with Errors',
    failed: 'Failed',
    cancelled: 'Cancelled',
    running: 'Running',
    converting: 'Converting',
    paused: 'Paused',
    pending: 'Pending',
    queued: 'Queued',
    retrying: 'Retrying',
    uploading: 'Uploading',
    validating: 'Validating',
    processing: 'Processing',
    compressing: 'Compressing',
  };
  return labels[status] || status;
}

function getStatusIcon(status: ConversionStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4" />;
    case 'completed_with_errors':
      return <AlertCircle className="w-4 h-4" />;
    case 'failed':
      return <AlertCircle className="w-4 h-4" />;
    case 'cancelled':
      return <AlertCircle className="w-4 h-4" />;
    case 'converting':
    case 'uploading':
    case 'validating':
    case 'processing':
    case 'compressing':
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case 'paused':
      return <Clock className="w-4 h-4" />;
    case 'retrying':
      return <Loader2 className="w-4 h-4 animate-spin" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

export const HistoryTable = memo(
  forwardRef<HTMLDivElement, HistoryTableProps>(
    ({ items, isLoading, sortBy, sortOrder, onSort, onViewDetails, onDownload, onDelete, onRetry, className }, ref) => {
      const columns = [
        { key: 'name', label: 'Job', sortable: true },
        { key: 'inputFormat', label: 'Input', sortable: true },
        { key: 'outputFormats', label: 'Output' },
        { key: 'startedAt', label: 'Started', sortable: true },
        { key: 'duration', label: 'Duration', sortable: true },
        { key: 'fileCount', label: 'Files', sortable: true },
        { key: 'totalSize', label: 'Size', sortable: true },
        { key: 'status', label: 'Status' },
        { key: 'actions', label: '' },
      ];

      return (
        <div ref={ref} className={cn('overflow-x-auto', className)}>
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-white/10">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider',
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
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-32" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-12" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-8" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <FileArchive className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                    <p className="text-slate-400">No conversion history found</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <motion.tr
                    key={item.id}
                    className="hover:bg-white/5 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white truncate max-w-[200px]">{item.name}</p>
                        <p className="text-xs text-slate-500">ID: {item.id.slice(0, 8)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-slate-300 font-medium">
                        {item.inputFormat.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.outputFormats.map((fmt) => (
                          <span key={fmt} className="px-1.5 py-0.5 text-[10px] rounded bg-brand-500/20 text-brand-400">
                            {fmt.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{formatRelativeTime(item.startedAt)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-300">{item.duration ? formatDuration(item.duration) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{item.fileCount}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{formatBytes(item.totalSize)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border', getStatusColor(item.status))}>
                        {getStatusIcon(item.status)}
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onViewDetails(item.id)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                          aria-label="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDownload(item.id)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                          aria-label="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
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

HistoryTable.displayName = 'HistoryTable';
