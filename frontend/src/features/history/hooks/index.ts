import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { historyApi } from '../api';
import type {
  UnifiedJob,
  JobDetails,
  UnifiedHistoryFilter,
  SavedFilter,
  PaginatedResponse,
  DownloadItem,
  Report,
  AuditLogEntry,
  HistoryDashboardStats,
  ActivityItem,
  ExportFormat,
} from '../types';

const KEYS = {
  dashboard: ['history', 'dashboard'] as const,
  dashboardStats: ['history', 'dashboard', 'stats'] as const,
  dashboardActivity: (limit?: number) => ['history', 'dashboard', 'activity', limit] as const,
  unified: ['history', 'unified'] as const,
  unifiedItem: (id: string) => ['history', 'unified', id] as const,
  unifiedDetails: (id: string) => ['history', 'unified', id, 'details'] as const,
  unifiedLogs: (id: string, params?: object) => ['history', 'unified', id, 'logs', params] as const,
  downloads: ['history', 'downloads'] as const,
  downloadItem: (id: string) => ['history', 'downloads', id] as const,
  reports: ['history', 'reports'] as const,
  reportItem: (id: string) => ['history', 'reports', id] as const,
  savedFilters: ['history', 'filters'] as const,
  audit: ['history', 'audit'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: KEYS.dashboardStats,
    queryFn: () => historyApi.dashboard.stats(),
    staleTime: 60 * 1000,
  });
}

export function useDashboardActivity(limit?: number) {
  return useQuery({
    queryKey: KEYS.dashboardActivity(limit),
    queryFn: () => historyApi.dashboard.recentActivity(limit),
    staleTime: 30 * 1000,
  });
}

export function useUnifiedHistory(params?: {
  page?: number;
  limit?: number;
  filter?: UnifiedHistoryFilter;
  sortBy?: string;
  sortOrder?: string;
}) {
  return useQuery({
    queryKey: [...KEYS.unified, params],
    queryFn: () => historyApi.unified.list(params),
    staleTime: 15 * 1000,
  });
}

export function useInfiniteUnifiedHistory(filter?: UnifiedHistoryFilter, sortBy?: string, sortOrder?: string) {
  return useInfiniteQuery({
    queryKey: [...KEYS.unified, 'infinite', filter, sortBy, sortOrder],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      historyApi.unified.list({ page: pageParam, limit: 20, filter, sortBy, sortOrder }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 15 * 1000,
  });
}

export function useUnifiedJob(id: string) {
  return useQuery({
    queryKey: KEYS.unifiedItem(id),
    queryFn: () => historyApi.unified.get(id),
    enabled: !!id,
  });
}

export function useJobDetails(id: string) {
  return useQuery({
    queryKey: KEYS.unifiedDetails(id),
    queryFn: () => historyApi.unified.details(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useJobLogs(id: string, params?: { page?: number; limit?: number; level?: string }) {
  return useQuery({
    queryKey: KEYS.unifiedLogs(id, params),
    queryFn: () => historyApi.unified.logs(id, params),
    enabled: !!id,
    staleTime: 5 * 1000,
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => historyApi.unified.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: KEYS.unifiedItem(id) });
      queryClient.invalidateQueries({ queryKey: KEYS.unified });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useRetryJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => historyApi.unified.retry(id),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(KEYS.unifiedItem(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.unified });
    },
  });
}

export function useDuplicateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => historyApi.unified.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.unified });
    },
  });
}

export function useDownloadJobLogs(id: string) {
  return useMutation({
    mutationFn: () => historyApi.unified.downloadLogs(id),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job-${id}-logs.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useDownloadJobReport(id: string) {
  return useMutation({
    mutationFn: () => historyApi.unified.downloadReport(id),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job-${id}-report.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useBulkDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => historyApi.bulk.delete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.unified });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useBulkRetry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => historyApi.bulk.retry(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.unified });
    },
  });
}

export function useBulkExport() {
  return useMutation({
    mutationFn: ({ ids, format }: { ids: string[]; format: ExportFormat }) =>
      historyApi.bulk.export(ids, format),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `history-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useDownloadList(params?: { page?: number; limit?: number; jobId?: string }) {
  return useQuery({
    queryKey: [...KEYS.downloads, params],
    queryFn: () => historyApi.downloads.list(params),
    staleTime: 30 * 1000,
  });
}

export function useDownloadItem(id: string) {
  return useQuery({
    queryKey: KEYS.downloadItem(id),
    queryFn: () => historyApi.downloads.get(id),
    enabled: !!id,
  });
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: (id: string) => historyApi.downloads.download(id),
    onSuccess: (blob, id) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `download-${id}`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useDeleteDownload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => historyApi.downloads.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.downloads });
    },
  });
}

export function useCopyDownloadLink() {
  return useMutation({
    mutationFn: (id: string) => historyApi.downloads.copyLink(id),
    onSuccess: (result) => {
      navigator.clipboard.writeText(result.url);
    },
  });
}

export function useVerifyDownload() {
  return useMutation({
    mutationFn: (id: string) => historyApi.downloads.verify(id),
  });
}

export function useBulkDownload() {
  return useMutation({
    mutationFn: (ids: string[]) => historyApi.downloads.bulkDownload(ids),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `downloads-${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useReportList(params?: { page?: number; limit?: number; type?: string }) {
  return useQuery({
    queryKey: [...KEYS.reports, params],
    queryFn: () => historyApi.reports.list(params),
    staleTime: 30 * 1000,
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, dateRange, format }: { type: Report['type']; dateRange?: { from: string; to: string }; format?: ExportFormat }) =>
      historyApi.reports.generate(type, dateRange, format),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.reports });
    },
  });
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: (id: string) => historyApi.reports.download(id),
    onSuccess: (blob, id) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id}`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => historyApi.reports.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.reports });
    },
  });
}

export function useSavedFilters() {
  return useQuery({
    queryKey: KEYS.savedFilters,
    queryFn: () => historyApi.savedFilters.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, filter }: { name: string; filter: UnifiedHistoryFilter }) =>
      historyApi.savedFilters.save(name, filter),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.savedFilters });
    },
  });
}

export function useDeleteSavedFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => historyApi.savedFilters.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.savedFilters });
    },
  });
}

export function useAuditLogs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: [...KEYS.audit, params],
    queryFn: () => historyApi.audit.list(params),
    staleTime: 30 * 1000,
  });
}

export function useExportAuditLogs() {
  return useMutation({
    mutationFn: (params?: { dateFrom?: string; dateTo?: string; format?: ExportFormat }) =>
      historyApi.audit.export(params),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}
