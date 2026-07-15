import apiClient from '@/lib/apiClient';
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

const BASE = '/api/v1/history';

export const historyApi = {
  dashboard: {
    stats: () =>
      apiClient.get<HistoryDashboardStats>(`${BASE}/dashboard/stats`).then((res) => res.data),
    recentActivity: (limit?: number) =>
      apiClient.get<ActivityItem[]>(`${BASE}/dashboard/activity`, { params: { limit } }).then((res) => res.data),
  },

  unified: {
    list: (params?: { page?: number; limit?: number; filter?: UnifiedHistoryFilter; sortBy?: string; sortOrder?: string }) =>
      apiClient.get<PaginatedResponse<UnifiedJob>>(`${BASE}/unified`, {
        params: { ...params, filter: params?.filter ? JSON.stringify(params.filter) : undefined },
      }).then((res) => res.data),
    get: (id: string) =>
      apiClient.get<UnifiedJob>(`${BASE}/unified/${id}`).then((res) => res.data),
    details: (id: string) =>
      apiClient.get<JobDetails>(`${BASE}/unified/${id}/details`).then((res) => res.data),
    delete: (id: string) =>
      apiClient.delete(`${BASE}/unified/${id}`).then((res) => res.data),
    retry: (id: string) =>
      apiClient.post<UnifiedJob>(`${BASE}/unified/${id}/retry`).then((res) => res.data),
    duplicate: (id: string) =>
      apiClient.post<UnifiedJob>(`${BASE}/unified/${id}/duplicate`).then((res) => res.data),
    logs: (id: string, params?: { page?: number; limit?: number; level?: string }) =>
      apiClient.get<{ logs: LogEntry[]; total: number }>(`${BASE}/unified/${id}/logs`, { params }).then((res) => res.data),
    downloadLogs: (id: string) =>
      apiClient.get(`${BASE}/unified/${id}/logs/download`, { responseType: 'blob' }).then((res) => res.data),
    downloadReport: (id: string) =>
      apiClient.get(`${BASE}/unified/${id}/report`, { responseType: 'blob' }).then((res) => res.data),
  },

  bulk: {
    delete: (ids: string[]) =>
      apiClient.post<{ success: number; failed: number }>(`${BASE}/bulk/delete`, { ids }).then((res) => res.data),
    retry: (ids: string[]) =>
      apiClient.post<{ success: number; failed: number }>(`${BASE}/bulk/retry`, { ids }).then((res) => res.data),
    export: (ids: string[], format: ExportFormat) =>
      apiClient.get(`${BASE}/bulk/export`, { params: { ids: ids.join(','), format }, responseType: 'blob' }).then((res) => res.data),
  },

  downloads: {
    list: (params?: { page?: number; limit?: number; jobId?: string }) =>
      apiClient.get<PaginatedResponse<DownloadItem>>(`${BASE}/downloads`, { params }).then((res) => res.data),
    get: (id: string) =>
      apiClient.get<DownloadItem>(`${BASE}/downloads/${id}`).then((res) => res.data),
    download: (id: string) =>
      apiClient.get(`${BASE}/downloads/${id}/download`, { responseType: 'blob' }).then((res) => res.data),
    delete: (id: string) =>
      apiClient.delete(`${BASE}/downloads/${id}`).then((res) => res.data),
    copyLink: (id: string) =>
      apiClient.get<{ url: string }>(`${BASE}/downloads/${id}/link`).then((res) => res.data),
    verify: (id: string) =>
      apiClient.get<{ valid: boolean; hash: string }>(`${BASE}/downloads/${id}/verify`).then((res) => res.data),
    bulkDownload: (ids: string[]) =>
      apiClient.get(`${BASE}/downloads/bulk`, { params: { ids: ids.join(',') }, responseType: 'blob' }).then((res) => res.data),
  },

  reports: {
    list: (params?: { page?: number; limit?: number; type?: string }) =>
      apiClient.get<PaginatedResponse<Report>>(`${BASE}/reports`, { params }).then((res) => res.data),
    generate: (type: Report['type'], dateRange?: { from: string; to: string }, format?: ExportFormat) =>
      apiClient.post<Report>(`${BASE}/reports/generate`, { type, dateRange, format }).then((res) => res.data),
    download: (id: string) =>
      apiClient.get(`${BASE}/reports/${id}/download`, { responseType: 'blob' }).then((res) => res.data),
    delete: (id: string) =>
      apiClient.delete(`${BASE}/reports/${id}`).then((res) => res.data),
  },

  savedFilters: {
    list: () =>
      apiClient.get<SavedFilter[]>(`${BASE}/filters`).then((res) => res.data),
    save: (name: string, filter: UnifiedHistoryFilter) =>
      apiClient.post<SavedFilter>(`${BASE}/filters`, { name, filter }).then((res) => res.data),
    delete: (id: string) =>
      apiClient.delete(`${BASE}/filters/${id}`).then((res) => res.data),
  },

  audit: {
    list: (params?: { page?: number; limit?: number; search?: string; action?: string; status?: string; dateFrom?: string; dateTo?: string }) =>
      apiClient.get<PaginatedResponse<AuditLogEntry>>(`${BASE}/audit`, { params }).then((res) => res.data),
    export: (params?: { dateFrom?: string; dateTo?: string; format?: ExportFormat }) =>
      apiClient.get(`${BASE}/audit/export`, { params, responseType: 'blob' }).then((res) => res.data),
  },
};

import type { LogEntry } from '../types';
