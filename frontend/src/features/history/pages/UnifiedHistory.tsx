import { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, ChevronLeft, ChevronRight, Plus, Trash2,
  RefreshCw, Archive
} from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { Tabs, TabsList, TabsTrigger } from '@/features/backup/components/ui/Tabs';
import { UnifiedHistoryTable } from '../components/ui/UnifiedHistoryTable';
import { SearchFilterBar } from '../components/ui/SearchFilterBar';
import { BulkActionToolbar } from '../components/ui/BulkActionToolbar';
import {
  useUnifiedHistory,
  useDeleteJob,
  useRetryJob,
  useBulkDelete,
  useBulkRetry,
  useBulkExport,
} from '../hooks';
import { useHistoryStore } from '../store';
import { toast } from 'react-hot-toast';

export const UnifiedHistory = memo(() => {
  const navigate = useNavigate();
  const {
    filters, setFilters, clearFilters,
    selectedIds, toggleSelection, selectAll, clearSelection,
    sortBy, sortOrder, setSortBy, setSortOrder,
    page, setPage, pageSize, setPageSize,
    searchQuery, setSearchQuery,
    activeTab, setActiveTab,
    ui, setShowFilters,
  } = useHistoryStore();

  const [activeTab_, setActiveTab_] = useState<'all' | 'backup' | 'conversion' | 'scheduled'>(activeTab);

  const handleTabChange = useCallback((tab: 'all' | 'backup' | 'conversion' | 'scheduled') => {
    setActiveTab_(tab);
    setActiveTab(tab);
    clearSelection();
  }, [setActiveTab, clearSelection]);

  const effectiveFilter = {
    ...filters,
    search: searchQuery || undefined,
    jobType: activeTab_ !== 'all' ? [activeTab_] : filters.jobType,
  };

  const { data, isLoading } = useUnifiedHistory({
    page,
    limit: pageSize,
    filter: effectiveFilter,
    sortBy,
    sortOrder,
  });

  const deleteJob = useDeleteJob();
  const retryJob = useRetryJob();
  const bulkDelete = useBulkDelete();
  const bulkRetry = useBulkRetry();
  const bulkExport = useBulkExport();

  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const handleSort = useCallback((key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  }, [sortBy, sortOrder, setSortBy, setSortOrder]);

  const handleSelectAll = useCallback((ids: string[]) => {
    if (ids.length === items.length) {
      clearSelection();
    } else {
      selectAll(ids);
    }
  }, [items.length, selectAll, clearSelection]);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Delete this job?')) {
      deleteJob.mutate(id, {
        onSuccess: () => toast.success('Job deleted'),
        onError: () => toast.error('Failed to delete'),
      });
    }
  }, [deleteJob]);

  const handleRetry = useCallback((id: string) => {
    retryJob.mutate(id, {
      onSuccess: () => toast.success('Job restarted'),
      onError: () => toast.error('Failed to restart'),
    });
  }, [retryJob]);

  const selectedArray = Array.from(selectedIds);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Unified History</h1>
          <p className="text-slate-400 mt-1">All backup and conversion jobs in one place</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => {
            if (selectedArray.length > 0) {
              bulkExport.mutate({ ids: selectedArray, format: 'csv' }, {
                onSuccess: () => toast.success('Export started'),
                onError: () => toast.error('Export failed'),
              });
            } else {
              toast('Select jobs to export');
            }
          }}>
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab_} onValueChange={(v) => handleTabChange(v as typeof activeTab_)}>
        <TabsList>
          <TabsTrigger value="all">All Jobs</TabsTrigger>
          <TabsTrigger value="backup">Backups</TabsTrigger>
          <TabsTrigger value="conversion">Conversions</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>
      </Tabs>

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={clearFilters}
        showFilters={ui.showFilters}
        onToggleFilters={() => setShowFilters(!ui.showFilters)}
      />

      <AnimatePresence>
        {selectedArray.length > 0 && (
          <BulkActionToolbar
            selectedCount={selectedArray.length}
            actions={[
              {
                id: 'retry',
                label: 'Retry',
                icon: <RefreshCw className="w-4 h-4" />,
                onClick: () => bulkRetry.mutate(selectedArray, {
                  onSuccess: () => { toast.success('Jobs restarted'); clearSelection(); },
                  onError: () => toast.error('Failed to restart'),
                }),
                loading: bulkRetry.isPending,
              },
              {
                id: 'export',
                label: 'Export',
                icon: <Download className="w-4 h-4" />,
                onClick: () => bulkExport.mutate({ ids: selectedArray, format: 'csv' }, {
                  onSuccess: () => toast.success('Export started'),
                }),
                loading: bulkExport.isPending,
              },
              {
                id: 'delete',
                label: 'Delete',
                icon: <Trash2 className="w-4 h-4" />,
                variant: 'destructive',
                onClick: () => {
                  if (confirm(`Delete ${selectedArray.length} job(s)?`)) {
                    bulkDelete.mutate(selectedArray, {
                      onSuccess: () => { toast.success('Jobs deleted'); clearSelection(); },
                      onError: () => toast.error('Failed to delete'),
                    });
                  }
                },
                loading: bulkDelete.isPending,
              },
            ]}
            onClearSelection={clearSelection}
          />
        )}
      </AnimatePresence>

      <Card variant="elevated" padding="none">
        <UnifiedHistoryTable
          items={items}
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          selectedIds={selectedIds}
          onSort={handleSort}
          onSelect={toggleSelection}
          onSelectAll={handleSelectAll}
          onViewDetails={(id) => navigate(`/dashboard/history/job/${id}`)}
          onDelete={handleDelete}
          onRetry={handleRetry}
        />

        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>Showing {items.length} of {data?.total || 0} entries</span>
            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1} leftIcon={<ChevronLeft className="w-4 h-4" />}>
              Prev
            </Button>
            <span className="px-3 text-sm text-slate-300">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages} rightIcon={<ChevronRight className="w-4 h-4" />}>
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
});

UnifiedHistory.displayName = 'UnifiedHistory';

export default UnifiedHistory;
