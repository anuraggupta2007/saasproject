import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { converterApi } from '../api';
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
  DownloadInfo,
  QueueItem,
} from '../types';

const KEYS = {
  files: ['converter', 'files'] as const,
  file: (id: string) => ['converter', 'files', id] as const,
  jobs: ['converter', 'jobs'] as const,
  job: (id: string) => ['converter', 'jobs', id] as const,
  jobProgress: (id: string) => ['converter', 'jobs', id, 'progress'] as const,
  jobLogs: (id: string, params?: object) => ['converter', 'jobs', id, 'logs', params] as const,
  jobStats: (id: string) => ['converter', 'jobs', id, 'stats'] as const,
  dashboard: ['converter', 'dashboard'] as const,
  dashboardStats: ['converter', 'dashboard', 'stats'] as const,
  dashboardActivity: (limit?: number) => ['converter', 'dashboard', 'activity', limit] as const,
  history: ['converter', 'history'] as const,
  historyItem: (id: string) => ['converter', 'history', id] as const,
  historyDetails: (id: string) => ['converter', 'history', id, 'details'] as const,
  downloads: (jobId: string) => ['converter', 'jobs', jobId, 'downloads'] as const,
  download: (jobId: string, fileId: string) => ['converter', 'jobs', jobId, 'downloads', fileId] as const,
  queue: ['converter', 'queue'] as const,
  queuePosition: (jobId: string) => ['converter', 'queue', jobId, 'position'] as const,
};

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ formData, onProgress }: { formData: FormData; onProgress?: (p: number) => void }) =>
      converterApi.files.upload(formData, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.files });
    },
  });
}

export function useValidateFile(fileId: string) {
  return useQuery({
    queryKey: KEYS.file(fileId),
    queryFn: () => converterApi.files.validate(fileId),
    enabled: !!fileId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => converterApi.files.delete(fileId),
    onSuccess: (_, fileId) => {
      queryClient.removeQueries({ queryKey: KEYS.file(fileId) });
      queryClient.invalidateQueries({ queryKey: KEYS.files });
    },
  });
}

export function useConverterJobs(params?: { page?: number; limit?: number; filter?: ConversionFilter }) {
  return useQuery({
    queryKey: [...KEYS.jobs, params],
    queryFn: () => converterApi.jobs.list(params),
    staleTime: 15 * 1000,
  });
}

export function useInfiniteConverterJobs(filter?: ConversionFilter) {
  return useInfiniteQuery({
    queryKey: [...KEYS.jobs, 'infinite', filter],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      converterApi.jobs.list({ page: pageParam, limit: 20, filter }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 15 * 1000,
  });
}

export function useConverterJob(id: string) {
  return useQuery({
    queryKey: KEYS.job(id),
    queryFn: () => converterApi.jobs.get(id),
    enabled: !!id,
    staleTime: 10 * 1000,
    refetchInterval: (query) => {
      const job = query.state.data;
      if (job && ['running', 'paused', 'queued', 'uploading', 'converting'].includes(job.status)) {
        return 5000;
      }
      return false;
    },
  });
}

export function useConversionProgress(id: string) {
  return useQuery({
    queryKey: KEYS.jobProgress(id),
    queryFn: () => converterApi.jobs.progress(id),
    enabled: !!id,
    refetchInterval: 3000,
    staleTime: 0,
  });
}

export function useConversionLogs(id: string, params?: { page?: number; limit?: number; level?: string }) {
  return useQuery({
    queryKey: KEYS.jobLogs(id, params),
    queryFn: () => converterApi.jobs.logs(id, params),
    enabled: !!id,
    staleTime: 5 * 1000,
  });
}

export function useConversionStats(id: string) {
  return useQuery({
    queryKey: KEYS.jobStats(id),
    queryFn: () => converterApi.jobs.stats(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCreateConversionJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateConversionRequest) => converterApi.jobs.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useUpdateConversionJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConversionRequest }) =>
      converterApi.jobs.update(id, data),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(KEYS.job(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useDeleteConversionJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => converterApi.jobs.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: KEYS.job(id) });
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useStartConversion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => converterApi.jobs.start(id),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(KEYS.job(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function usePauseConversion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => converterApi.jobs.pause(id),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(KEYS.job(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useResumeConversion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => converterApi.jobs.resume(id),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(KEYS.job(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useCancelConversion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => converterApi.jobs.cancel(id),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(KEYS.job(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useRetryConversion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => converterApi.jobs.retry(id),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(KEYS.job(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useDownloadConversionLog(id: string) {
  return useMutation({
    mutationFn: () => converterApi.jobs.downloadLog(id),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversion-${id}-log.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: KEYS.dashboardStats,
    queryFn: () => converterApi.dashboard.stats(),
    staleTime: 60 * 1000,
  });
}

export function useDashboardActivity(limit?: number) {
  return useQuery({
    queryKey: KEYS.dashboardActivity(limit),
    queryFn: () => converterApi.dashboard.recentActivity(limit),
    staleTime: 30 * 1000,
  });
}

export function useConversionHistory(params?: { page?: number; limit?: number; filter?: ConversionFilter }) {
  return useQuery({
    queryKey: [...KEYS.history, params],
    queryFn: () => converterApi.history.list(params),
    staleTime: 30 * 1000,
  });
}

export function useInfiniteConversionHistory(filter?: ConversionFilter) {
  return useInfiniteQuery({
    queryKey: [...KEYS.history, 'infinite', filter],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      converterApi.history.list({ page: pageParam, limit: 20, filter }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 30 * 1000,
  });
}

export function useHistoryItem(id: string) {
  return useQuery({
    queryKey: KEYS.historyItem(id),
    queryFn: () => converterApi.history.get(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useHistoryDetails(id: string) {
  return useQuery({
    queryKey: KEYS.historyDetails(id),
    queryFn: () => converterApi.history.details(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useDeleteHistoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => converterApi.history.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: KEYS.historyItem(id) });
      queryClient.invalidateQueries({ queryKey: KEYS.history });
    },
  });
}

export function useExportHistory() {
  return useMutation({
    mutationFn: (filter?: ConversionFilter) => converterApi.history.export(filter),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversion-history-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useDownloadList(jobId: string) {
  return useQuery({
    queryKey: KEYS.downloads(jobId),
    queryFn: () => converterApi.downloads.list(jobId),
    enabled: !!jobId,
    staleTime: 30 * 1000,
  });
}

export function useDownloadFile(jobId: string, fileId: string) {
  return useQuery({
    queryKey: KEYS.download(jobId, fileId),
    queryFn: () => converterApi.downloads.get(jobId, fileId),
    enabled: !!jobId && !!fileId,
    staleTime: 30 * 1000,
  });
}

export function useDownloadConvertedFile() {
  return useMutation({
    mutationFn: ({ jobId, fileId }: { jobId: string; fileId: string }) =>
      converterApi.downloads.download(jobId, fileId),
    onSuccess: (blob, { fileId }) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted-${fileId}`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useDownloadAllConverted() {
  return useMutation({
    mutationFn: (jobId: string) => converterApi.downloads.downloadAll(jobId),
    onSuccess: (blob, jobId) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversion-${jobId}-all.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useConversionQueue() {
  return useQuery({
    queryKey: KEYS.queue,
    queryFn: () => converterApi.queue.list(),
    staleTime: 10 * 1000,
    refetchInterval: 10000,
  });
}

export function useQueuePosition(jobId: string) {
  return useQuery({
    queryKey: KEYS.queuePosition(jobId),
    queryFn: () => converterApi.queue.position(jobId),
    enabled: !!jobId,
    staleTime: 10 * 1000,
    refetchInterval: 10000,
  });
}
