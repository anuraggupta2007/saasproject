import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Download, ChevronLeft, ChevronRight, Calendar, Plus, Trash2, RefreshCw
} from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { HistoryTable } from '../components/ui/HistoryTable';
import { useInfiniteConversionHistory, useDeleteHistoryItem, useExportHistory } from '../hooks';
import { useConverterStore } from '../store';
import { toast } from 'react-hot-toast';
import type { ConversionFilter, ConversionStatus } from '../types';

export const ConversionHistory = memo(() => {
  const navigate = useNavigate();
  const { filters, setFilters } = useConverterStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('startedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const conversionFilter: ConversionFilter = {
    search: searchQuery || undefined,
    status: statusFilter ? [statusFilter as ConversionStatus] : undefined,
  };

  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteConversionHistory(conversionFilter);
  const deleteMutation = useDeleteHistoryItem();
  const exportMutation = useExportHistory();

  const items = data?.pages.flatMap(p => p.items) || [];

  const sortedItems = [...items].sort((a, b) => {
    const aVal = (a as any)[sortBy];
    const bVal = (b as any)[sortBy];
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = useCallback((key: string) => {
    if (sortBy === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  }, [sortBy]);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Delete this conversion history entry?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success('History entry deleted'),
        onError: () => toast.error('Failed to delete'),
      });
    }
  }, [deleteMutation]);

  const handleExport = useCallback(() => {
    exportMutation.mutate(conversionFilter, {
      onSuccess: () => toast.success('Export started'),
      onError: () => toast.error('Export failed'),
    });
  }, [exportMutation, conversionFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Conversion History</h1>
          <p className="text-slate-400 mt-1">View and manage your conversion history</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport}>
            Export CSV
          </Button>
          <Button variant="brand" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/dashboard/convert/wizard')}>
            New Conversion
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
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="running">Running</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter(''); setPage(1); }}>
              Clear Filters
            </Button>
          </div>
        </div>

        <HistoryTable
          items={sortedItems}
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onViewDetails={(id) => navigate(`/dashboard/convert/history/${id}`)}
          onDownload={(id) => navigate(`/dashboard/convert/downloads/${id}`)}
          onDelete={handleDelete}
          onRetry={(id) => toast('Retry coming soon')}
        />

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

ConversionHistory.displayName = 'ConversionHistory';

export default ConversionHistory;
