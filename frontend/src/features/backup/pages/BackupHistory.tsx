import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Download, ChevronLeft, ChevronRight, Calendar, Clock,
  Database, FolderArchive, RefreshCw, CheckCircle, XCircle, AlertCircle,
  MoreVertical, Eye, Trash2, ChevronUp, ChevronDown, Plus
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Badge, DropdownButton, Avatar, AvatarGroup, StatusBadge } from '../components/ui';
import { Input } from '../components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/Select';
import { Progress } from '../components/ui/Progress';
import { backupApi } from '../api';
import { useHistory, useInfiniteHistory, useDeleteHistoryItem, useExportHistory } from '../hooks';
import { cn } from '@/utils/cn';
import { formatBytes, formatDuration, formatRelativeTime } from '@/utils/format';
import { useBackupStore } from '../store';
import { toast } from 'react-hot-toast';
import type { BackupHistoryItem, HistoryFilter, JobStatus } from '../types';

const statusConfig: Record<string, { variant: string; icon: React.ComponentType<{ className?: string }> }> = {
  completed: { variant: 'success', icon: CheckCircle },
  completed_with_errors: { variant: 'warning', icon: AlertCircle },
  failed: { variant: 'error', icon: XCircle },
  cancelled: { variant: 'neutral', icon: XCircle },
  running: { variant: 'info', icon: RefreshCw },
  paused: { variant: 'warning', icon: Clock },
  pending: { variant: 'neutral', icon: Clock },
  queued: { variant: 'neutral', icon: Clock },
  retrying: { variant: 'info', icon: RefreshCw },
};

export const BackupHistory = memo(() => {
  const navigate = useNavigate();
  const { filters, setHistoryFilters } = useBackupStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<'startedAt' | 'completedAt' | 'duration' | 'emailsProcessed' | 'size'>('startedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({
    from: filters.history?.dateFrom,
    to: filters.history?.dateTo,
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteHistory({
    status: filters.history?.status,
    accountId: filters.history?.accountId ? [filters.history.accountId] : undefined,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    search: searchQuery,
  } as HistoryFilter);

  const deleteMutation = useDeleteHistoryItem();
  const exportMutation = useExportHistory();

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setHistoryFilters({ ...filters.history });
    setPage(1);
  }, [filters.history, setHistoryFilters]);

  const handleSort = (key: typeof sortBy) => {
    if (sortBy === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this backup history entry?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success('History entry deleted'),
        onError: () => toast.error('Failed to delete'),
      });
    }
  };

  const handleExport = () => {
    exportMutation.mutate({
      ...filters.history,
      accountId: filters.history?.accountId ? [filters.history.accountId] : undefined,
    } as HistoryFilter, {
      onSuccess: () => toast.success('Export started'),
      onError: () => toast.error('Export failed'),
    });
  };

  const items = data?.pages.flatMap(p => p.items) || [];

  const sortedItems = [...items].sort((a, b) => {
    const aVal = a[sortBy] ?? '';
    const bVal = b[sortBy] ?? '';
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Backup History</h1>
          <p className="text-slate-400 mt-1">View and manage your backup job history</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport}>
            Export CSV
          </Button>
          <Button variant="brand" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/dashboard/backup/wizard')}>
            New Backup Job
          </Button>
        </div>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search history..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filters.history?.status?.join(',') || ''} onValueChange={v => setHistoryFilters({ ...filters.history, status: v.split(',').filter(Boolean) as JobStatus[] })}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      <config.icon className="w-4 h-4" />
                      {status}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={(filters.history as any)?.backupType?.join(',') || ''} onValueChange={v => setHistoryFilters({ ...filters.history })}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="incremental">Incremental</SelectItem>
                <SelectItem value="new_only">New Only</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <Input type="date" value={dateRange.from || ''} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} className="w-36" />
              <span className="text-slate-500">to</span>
              <Input type="date" value={dateRange.to || ''} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} className="w-36" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setDateRange({}); setHistoryFilters({}); setPage(1); }}>
              Clear Filters
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === sortedItems.length && sortedItems.length > 0}
                    onChange={e => setSelectedIds(e.target.checked ? new Set(sortedItems.map(i => i.id)) : new Set())}
                    className="w-4 h-4 rounded border-white/20 text-brand-500 focus:ring-brand-500"
                  />
                </th>
                {[
                  { key: 'jobName', label: 'Job' },
                  { key: 'accountEmail', label: 'Account' },
                  { key: 'backupType', label: 'Type' },
                  { key: 'startedAt', label: 'Started', sortable: true },
                  { key: 'completedAt', label: 'Completed', sortable: true },
                  { key: 'duration', label: 'Duration', sortable: true },
                  { key: 'emailsProcessed', label: 'Emails', sortable: true },
                  { key: 'size', label: 'Size', sortable: true },
                  { key: 'status', label: 'Status' },
                  { key: 'actions', label: '', width: 'w-24' },
                ].map(col => (
                  <th
                    key={col.key}
                    className={cn('px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider', col.width, col.sortable && 'cursor-pointer hover:text-white')}
                    onClick={col.sortable ? () => handleSort(col.key as any) : undefined}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortBy === col.key && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-8" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-32" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-8" /></td>
                  </tr>
                ))
              ) : sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <FolderArchive className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                    <p className="text-slate-400">No backup history found</p>
                    <Button variant="brand" className="mt-3" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/dashboard/backup/wizard')}>
                      Create First Backup
                    </Button>
                  </td>
                </tr>
              ) : (
                sortedItems.map((item, index) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn('hover:bg-white/5 transition-colors', selectedIds.has(item.id) && 'bg-brand-500/5')}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={e => {
                          const next = new Set(selectedIds);
                          e.target.checked ? next.add(item.id) : next.delete(item.id);
                          setSelectedIds(next);
                        }}
                        className="w-4 h-4 rounded border-white/20 text-brand-500 focus:ring-brand-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white truncate max-w-[200px] capitalize">{item.backupType.replace('_', ' ')} Backup</p>
                        <p className="text-xs text-slate-500">{item.provider}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={item.accountEmail} size="xs" />
                        <span className="text-sm text-slate-300 truncate max-w-[150px]">{item.accountEmail}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.backupType === 'full' ? 'default' : item.backupType === 'incremental' ? 'info' : 'success'} size="sm">
                        {item.backupType.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{formatRelativeTime(item.startedAt)}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{item.completedAt ? formatRelativeTime(item.completedAt) : '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-300">{item.duration ? formatDuration(item.duration) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{item.emailsProcessed?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{item.size ? formatBytes(item.size) : '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <DropdownButton
                        items={[
                          { label: 'View Details', icon: <Eye className="w-4 h-4" />, onClick: () => navigate(`/dashboard/backup/history/${item.id}`) },
                          { label: 'Download Report', icon: <Download className="w-4 h-4" />, onClick: () => { /* download report */ } },
                          { label: 'Retry', icon: <RefreshCw className="w-4 h-4" />, onClick: () => { /* retry */ }, disabled: ['completed', 'completed_with_errors'].includes(item.status) },
                          { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => handleDelete(item.id), danger: true },
                        ]}
                        size="sm"
                        variant="ghost"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-400 hover:text-white" />
                      </DropdownButton>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>Showing {sortedItems.length} of {data.pages[0]?.total || 0} entries</span>
              <Select value={pageSize.toString()} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1} leftIcon={<ChevronLeft className="w-4 h-4" />}>
                Previous
              </Button>
              <span className="px-3 text-sm text-slate-300">Page {page}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasNextPage} rightIcon={<ChevronRight className="w-4 h-4" />}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
});

BackupHistory.displayName = 'BackupHistory';

export default BackupHistory;