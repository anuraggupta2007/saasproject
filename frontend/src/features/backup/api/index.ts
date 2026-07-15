import apiClient from '@/lib/apiClient';
import type {
  Provider,
  ConnectedAccount,
  BackupJob,
  BackupSchedule,
  BackupHistoryItem,
  BackupHistoryDetails,
  StorageUsage,
  FolderInfo,
  MessageSummary,
  ProviderConnectionFormData,
  ProviderConnectionResponse,
  CreateJobRequest,
  UpdateJobRequest,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  PaginatedResponse,
  JobFilter,
  HistoryFilter,
  JobStatus,
  ConnectionTestResult,
} from '../types';

const BASE = '/api/v1/backup';

export const backupApi = {
  providers: {
    list: () => apiClient.get<Provider[]>(`${BASE}/providers`).then((res) => res.data),
    get: (id: string) => apiClient.get<Provider>(`${BASE}/providers/${id}`).then((res) => res.data),
    testConnection: (data: ProviderConnectionFormData) =>
      apiClient.post<ConnectionTestResult>(`${BASE}/providers/test`, data).then((res) => res.data),
    connect: (data: ProviderConnectionFormData) =>
      apiClient.post<ProviderConnectionResponse>(`${BASE}/connect`, data).then((res) => res.data),
    disconnect: (accountId: string) =>
      apiClient.delete(`${BASE}/accounts/${accountId}`).then((res) => res.data),
    reconnect: (accountId: string) =>
      apiClient.post(`${BASE}/accounts/${accountId}/reconnect`).then((res) => res.data),
  },

  accounts: {
    list: (params?: { status?: string; page?: number; limit?: number }) =>
      apiClient.get<PaginatedResponse<ConnectedAccount>>(`${BASE}/accounts`, { params }).then((res) => res.data),
    get: (id: string) => apiClient.get<ConnectedAccount>(`${BASE}/accounts/${id}`).then((res) => res.data),
    update: (id: string, data: Partial<ConnectedAccount['settings']>) =>
      apiClient.patch<ConnectedAccount>(`${BASE}/accounts/${id}`, data).then((res) => res.data),
    delete: (id: string) => apiClient.delete(`${BASE}/accounts/${id}`).then((res) => res.data),
    test: (id: string) =>
      apiClient.post<ConnectionTestResult>(`${BASE}/accounts/${id}/test`).then((res) => res.data),
    folders: (accountId: string) =>
      apiClient.get<FolderInfo[]>(`${BASE}/accounts/${accountId}/folders`).then((res) => res.data),
    messages: (accountId: string, folderId: string, params?: {
      page?: number;
      limit?: number;
      search?: string;
    }) =>
      apiClient.get<PaginatedResponse<MessageSummary>>(
        `${BASE}/accounts/${accountId}/folders/${folderId}/messages`,
        { params }
      ).then((res) => res.data),
    storage: (accountId: string) =>
      apiClient.get<{ used: number; limit: number }>(`${BASE}/accounts/${accountId}/storage`).then((res) => res.data),
  },

  jobs: {
    list: (params?: { page?: number; limit?: number; filter?: JobFilter }) =>
      apiClient.get<PaginatedResponse<BackupJob>>(`${BASE}/jobs`, {
        params: { ...params, filter: params?.filter ? JSON.stringify(params.filter) : undefined },
      }).then((res) => res.data),
    get: (id: string) => apiClient.get<BackupJob>(`${BASE}/jobs/${id}`).then((res) => res.data),
    create: (data: CreateJobRequest) => apiClient.post<BackupJob>(`${BASE}/jobs`, data).then((res) => res.data),
    update: (id: string, data: UpdateJobRequest) =>
      apiClient.patch<BackupJob>(`${BASE}/jobs/${id}`, data).then((res) => res.data),
    delete: (id: string) => apiClient.delete(`${BASE}/jobs/${id}`).then((res) => res.data),
    start: (id: string) => apiClient.post<BackupJob>(`${BASE}/jobs/${id}/start`).then((res) => res.data),
    pause: (id: string) => apiClient.post<BackupJob>(`${BASE}/jobs/${id}/pause`).then((res) => res.data),
    resume: (id: string) => apiClient.post<BackupJob>(`${BASE}/jobs/${id}/resume`).then((res) => res.data),
    cancel: (id: string) => apiClient.post<BackupJob>(`${BASE}/jobs/${id}/cancel`).then((res) => res.data),
    retry: (id: string) => apiClient.post<BackupJob>(`${BASE}/jobs/${id}/retry`).then((res) => res.data),
    progress: (id: string) =>
      apiClient.get<BackupJob['progress']>(`${BASE}/jobs/${id}/progress`).then((res) => res.data),
    logs: (id: string, params?: { page?: number; limit?: number; level?: string }) =>
      apiClient.get<{ logs: string[]; total: number }>(`${BASE}/jobs/${id}/logs`, { params }).then((res) => res.data),
    downloadLog: (id: string) =>
      apiClient.get(`${BASE}/jobs/${id}/logs/download`, { responseType: 'blob' }).then((res) => res.data),
    downloadReport: (id: string) =>
      apiClient.get(`${BASE}/jobs/${id}/report`, { responseType: 'blob' }).then((res) => res.data),
    stats: (id: string) => apiClient.get<BackupJob['stats']>(`${BASE}/jobs/${id}/stats`).then((res) => res.data),
  },

  schedules: {
    list: (params?: { page?: number; limit?: number; accountId?: string }) =>
      apiClient.get<PaginatedResponse<BackupSchedule>>(`${BASE}/schedules`, { params }).then((res) => res.data),
    get: (id: string) => apiClient.get<BackupSchedule>(`${BASE}/schedules/${id}`).then((res) => res.data),
    create: (data: CreateScheduleRequest) =>
      apiClient.post<BackupSchedule>(`${BASE}/schedules`, data).then((res) => res.data),
    update: (id: string, data: UpdateScheduleRequest) =>
      apiClient.patch<BackupSchedule>(`${BASE}/schedules/${id}`, data).then((res) => res.data),
    delete: (id: string) => apiClient.delete(`${BASE}/schedules/${id}`).then((res) => res.data),
    enable: (id: string) => apiClient.post(`${BASE}/schedules/${id}/enable`).then((res) => res.data),
    disable: (id: string) => apiClient.post(`${BASE}/schedules/${id}/disable`).then((res) => res.data),
    nextRuns: (params?: { limit?: number }) =>
      apiClient.get<{ scheduleId: string; nextRunAt: string }[]>(
        `${BASE}/schedules/next-runs`,
        { params }
      ).then((res) => res.data),
  },

  history: {
    list: (params?: { page?: number; limit?: number; filter?: HistoryFilter }) =>
      apiClient.get<PaginatedResponse<BackupHistoryItem>>(`${BASE}/history`, {
        params: { ...params, filter: params?.filter ? JSON.stringify(params.filter) : undefined },
      }).then((res) => res.data),
    get: (id: string) => apiClient.get<BackupHistoryItem>(`${BASE}/history/${id}`).then((res) => res.data),
    details: (id: string) => apiClient.get<BackupHistoryDetails>(`${BASE}/history/${id}/details`).then((res) => res.data),
    delete: (id: string) => apiClient.delete(`${BASE}/history/${id}`).then((res) => res.data),
    export: (params?: HistoryFilter) =>
      apiClient.get(`${BASE}/history/export`, { params, responseType: 'blob' }).then((res) => res.data),
  },

  storage: {
    usage: () => apiClient.get<StorageUsage>(`${BASE}/storage/usage`).then((res) => res.data),
    byAccount: () =>
      apiClient.get<Record<string, { used: number; limit: number }>>(`${BASE}/storage/by-account`).then((res) => res.data),
    trend: (params?: { days?: number; granularity?: 'day' | 'week' | 'month' }) =>
      apiClient.get<{ date: string; used: number }[]>(`${BASE}/storage/trend`, { params }).then((res) => res.data),
    validate: (location: string, path: string, credentials?: Record<string, string>) =>
      apiClient.post<{ valid: boolean; freeSpace: number; message: string }>(
        `${BASE}/storage/validate`,
        { location, path, credentials }
      ).then((res) => res.data),
    space: (location: string, path: string, credentials?: Record<string, string>) =>
      apiClient.post<{ freeSpace: number; totalSpace: number }>(
        `${BASE}/storage/space`,
        { location, path, credentials }
      ).then((res) => res.data),
  },
};

export type WebSocketMessage =
  | { type: 'progress'; data: BackupJob['progress'] }
  | { type: 'log'; data: { level: string; message: string; timestamp: string } }
  | { type: 'status'; data: { status: JobStatus; error?: string } }
  | { type: 'error'; data: { code: string; message: string; recoverable: boolean } }
  | { type: 'complete'; data: BackupJob }
  | { type: 'heartbeat' };

export function parseWebSocketMessage(event: MessageEvent): WebSocketMessage {
  try {
    return JSON.parse(event.data);
  } catch {
    return { type: 'heartbeat' };
  }
}

export function createJobWebSocket(jobId: string, token: string): WebSocket {
  const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8080'}/api/v1/ws/jobs/${jobId}?token=${token}`;
  return new WebSocket(wsUrl);
}