import apiClient from '@/lib/apiClient';
import type {
  ConversionJob,
  ConversionHistoryItem,
  ConversionHistoryDetails,
  ConversionDashboardStats,
  ConversionActivity,
  ConversionFilter,
  PaginatedResponse,
  CreateConversionRequest,
  UpdateConversionRequest,
  UploadResponse,
  FileValidationResponse,
  ConvertedFile,
  DownloadInfo,
  QueueItem,
  ConversionStatus,
} from '../types';

const BASE = '/api/v1/converter';

export const converterApi = {
  files: {
    upload: (formData: FormData, onProgress?: (p: number) => void) =>
      apiClient.post<UploadResponse>(`${BASE}/files/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      }).then((res) => res.data),
    validate: (fileId: string) =>
      apiClient.get<FileValidationResponse>(`${BASE}/files/${fileId}/validate`).then((res) => res.data),
    delete: (fileId: string) =>
      apiClient.delete(`${BASE}/files/${fileId}`).then((res) => res.data),
    get: (fileId: string) =>
      apiClient.get<UploadResponse>(`${BASE}/files/${fileId}`).then((res) => res.data),
  },

  jobs: {
    list: (params?: { page?: number; limit?: number; filter?: ConversionFilter }) =>
      apiClient.get<PaginatedResponse<ConversionJob>>(`${BASE}/jobs`, {
        params: { ...params, filter: params?.filter ? JSON.stringify(params.filter) : undefined },
      }).then((res) => res.data),
    get: (id: string) =>
      apiClient.get<ConversionJob>(`${BASE}/jobs/${id}`).then((res) => res.data),
    create: (data: CreateConversionRequest) =>
      apiClient.post<ConversionJob>(`${BASE}/jobs`, data).then((res) => res.data),
    update: (id: string, data: UpdateConversionRequest) =>
      apiClient.patch<ConversionJob>(`${BASE}/jobs/${id}`, data).then((res) => res.data),
    delete: (id: string) =>
      apiClient.delete(`${BASE}/jobs/${id}`).then((res) => res.data),
    start: (id: string) =>
      apiClient.post<ConversionJob>(`${BASE}/jobs/${id}/start`).then((res) => res.data),
    pause: (id: string) =>
      apiClient.post<ConversionJob>(`${BASE}/jobs/${id}/pause`).then((res) => res.data),
    resume: (id: string) =>
      apiClient.post<ConversionJob>(`${BASE}/jobs/${id}/resume`).then((res) => res.data),
    cancel: (id: string) =>
      apiClient.post<ConversionJob>(`${BASE}/jobs/${id}/cancel`).then((res) => res.data),
    retry: (id: string) =>
      apiClient.post<ConversionJob>(`${BASE}/jobs/${id}/retry`).then((res) => res.data),
    progress: (id: string) =>
      apiClient.get<ConversionJob['progress']>(`${BASE}/jobs/${id}/progress`).then((res) => res.data),
    logs: (id: string, params?: { page?: number; limit?: number; level?: string }) =>
      apiClient.get<{ logs: string[]; total: number }>(`${BASE}/jobs/${id}/logs`, { params }).then((res) => res.data),
    downloadLog: (id: string) =>
      apiClient.get(`${BASE}/jobs/${id}/logs/download`, { responseType: 'blob' }).then((res) => res.data),
    stats: (id: string) =>
      apiClient.get<ConversionJob['stats']>(`${BASE}/jobs/${id}/stats`).then((res) => res.data),
  },

  dashboard: {
    stats: () =>
      apiClient.get<ConversionDashboardStats>(`${BASE}/dashboard/stats`).then((res) => res.data),
    recentActivity: (limit?: number) =>
      apiClient.get<ConversionActivity[]>(`${BASE}/dashboard/activity`, { params: { limit } }).then((res) => res.data),
  },

  history: {
    list: (params?: { page?: number; limit?: number; filter?: ConversionFilter }) =>
      apiClient.get<PaginatedResponse<ConversionHistoryItem>>(`${BASE}/history`, {
        params: { ...params, filter: params?.filter ? JSON.stringify(params.filter) : undefined },
      }).then((res) => res.data),
    get: (id: string) =>
      apiClient.get<ConversionHistoryItem>(`${BASE}/history/${id}`).then((res) => res.data),
    details: (id: string) =>
      apiClient.get<ConversionHistoryDetails>(`${BASE}/history/${id}/details`).then((res) => res.data),
    delete: (id: string) =>
      apiClient.delete(`${BASE}/history/${id}`).then((res) => res.data),
    export: (filter?: ConversionFilter) =>
      apiClient.get(`${BASE}/history/export`, { params: filter, responseType: 'blob' }).then((res) => res.data),
  },

  downloads: {
    list: (jobId: string) =>
      apiClient.get<DownloadInfo[]>(`${BASE}/jobs/${jobId}/downloads`).then((res) => res.data),
    get: (jobId: string, fileId: string) =>
      apiClient.get<DownloadInfo>(`${BASE}/jobs/${jobId}/downloads/${fileId}`).then((res) => res.data),
    download: (jobId: string, fileId: string) =>
      apiClient.get(`${BASE}/jobs/${jobId}/downloads/${fileId}/download`, { responseType: 'blob' }).then((res) => res.data),
    downloadAll: (jobId: string) =>
      apiClient.get(`${BASE}/jobs/${jobId}/downloads/zip`, { responseType: 'blob' }).then((res) => res.data),
  },

  queue: {
    list: () =>
      apiClient.get<QueueItem[]>(`${BASE}/queue`).then((res) => res.data),
    position: (jobId: string) =>
      apiClient.get<{ position: number }>(`${BASE}/queue/${jobId}/position`).then((res) => res.data),
  },
};

export type WebSocketMessage =
  | { type: 'progress'; data: ConversionJob['progress'] }
  | { type: 'log'; data: { level: string; message: string; timestamp: string } }
  | { type: 'status'; data: { status: ConversionStatus; error?: string } }
  | { type: 'stage'; data: { stage: string; progress: number } }
  | { type: 'complete'; data: ConversionJob }
  | { type: 'error'; data: { code: string; message: string; recoverable: boolean } }
  | { type: 'heartbeat' };

export function parseWebSocketMessage(event: MessageEvent): WebSocketMessage {
  try {
    return JSON.parse(event.data);
  } catch {
    return { type: 'heartbeat' };
  }
}

export function createConversionWebSocket(jobId: string, token: string): WebSocket {
  const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8080'}/api/v1/ws/converter/${jobId}?token=${token}`;
  return new WebSocket(wsUrl);
}
