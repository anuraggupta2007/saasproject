import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { backupApi } from '../api';
import type {
  Provider,
  ConnectedAccount,
  BackupJob,
  BackupSchedule,
  BackupHistoryItem,
  StorageUsage,
  FolderInfo,
  MessageSummary,
  ProviderConnectionFormData,
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

const KEYS = {
  providers: ['backup', 'providers'] as const,
  accounts: ['backup', 'accounts'] as const,
  account: (id: string) => ['backup', 'accounts', id] as const,
  accountFolders: (accountId: string) => ['backup', 'accounts', accountId, 'folders'] as const,
  accountMessages: (accountId: string, folderId: string, params?: object) =>
    ['backup', 'accounts', accountId, 'folders', folderId, 'messages', params] as const,
  accountStorage: (accountId: string) => ['backup', 'accounts', accountId, 'storage'] as const,
  jobs: ['backup', 'jobs'] as const,
  job: (id: string) => ['backup', 'jobs', id] as const,
  jobProgress: (id: string) => ['backup', 'jobs', id, 'progress'] as const,
  jobLogs: (id: string, params?: object) => ['backup', 'jobs', id, 'logs', params] as const,
  jobStats: (id: string) => ['backup', 'jobs', id, 'stats'] as const,
  schedules: ['backup', 'schedules'] as const,
  schedule: (id: string) => ['backup', 'schedules', id] as const,
  history: ['backup', 'history'] as const,
  historyItem: (id: string) => ['backup', 'history', id] as const,
  historyDetails: (id: string) => ['backup', 'history', id, 'details'] as const,
  storage: ['backup', 'storage'] as const,
  storageUsage: ['backup', 'storage', 'usage'] as const,
  storageTrend: ['backup', 'storage', 'trend'] as const,
  nextScheduleRuns: ['backup', 'schedules', 'next-runs'] as const,
};

export function useProviders() {
  return useQuery({
    queryKey: KEYS.providers,
    queryFn: backupApi.providers.list,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: [...KEYS.providers, id],
    queryFn: () => backupApi.providers.get(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTestProviderConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProviderConnectionFormData) => backupApi.providers.testConnection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.providers });
    },
  });
}

export function useConnectProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProviderConnectionFormData) => backupApi.providers.connect(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.accounts });
      queryClient.invalidateQueries({ queryKey: KEYS.providers });
    },
  });
}

export function useDisconnectProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => backupApi.providers.disconnect(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.accounts });
    },
  });
}

export function useReconnectProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => backupApi.providers.reconnect(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.accounts });
    },
  });
}

export function useAccounts(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...KEYS.accounts, params],
    queryFn: () => backupApi.accounts.list(params),
    staleTime: 30 * 1000,
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: KEYS.account(id),
    queryFn: () => backupApi.accounts.get(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ConnectedAccount['settings']> }) =>
      backupApi.accounts.update(id, data),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(KEYS.account(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.accounts });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backupApi.accounts.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: KEYS.account(id) });
      queryClient.invalidateQueries({ queryKey: KEYS.accounts });
    },
  });
}

export function useTestAccountConnection() {
  return useMutation({
    mutationFn: (accountId: string) => backupApi.accounts.test(accountId),
  });
}

export function useAccountFolders(accountId: string) {
  return useQuery({
    queryKey: KEYS.accountFolders(accountId),
    queryFn: () => backupApi.accounts.folders(accountId),
    enabled: !!accountId,
    staleTime: 60 * 1000,
  });
}

export function useAccountMessages(
  accountId: string,
  folderId: string,
  params?: { page?: number; limit?: number; search?: string }
) {
  return useQuery({
    queryKey: KEYS.accountMessages(accountId, folderId, params),
    queryFn: () => backupApi.accounts.messages(accountId, folderId, params),
    enabled: !!accountId && !!folderId,
    staleTime: 30 * 1000,
  });
}

export function useAccountStorage(accountId: string) {
  return useQuery({
    queryKey: KEYS.accountStorage(accountId),
    queryFn: () => backupApi.accounts.storage(accountId),
    enabled: !!accountId,
    staleTime: 60 * 1000,
  });
}

export function useJobs(params?: { page?: number; limit?: number; filter?: JobFilter }) {
  return useQuery({
    queryKey: [...KEYS.jobs, params],
    queryFn: () => backupApi.jobs.list(params),
    staleTime: 15 * 1000,
  });
}

export function useInfiniteJobs(filter?: JobFilter) {
  return useInfiniteQuery({
    queryKey: [...KEYS.jobs, 'infinite', filter],
    queryFn: ({ pageParam }: { pageParam: number }) => backupApi.jobs.list({ page: pageParam, limit: 20, filter }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 15 * 1000,
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: KEYS.job(id),
    queryFn: () => backupApi.jobs.get(id),
    enabled: !!id,
    staleTime: 10 * 1000,
    refetchInterval: (query) => {
      const job = query.state.data;
      if (job && ['running', 'paused', 'queued'].includes(job.status)) {
        return 5000;
      }
      return false;
    },
  });
}

export function useJobProgress(id: string) {
  return useQuery({
    queryKey: KEYS.jobProgress(id),
    queryFn: () => backupApi.jobs.progress(id),
    enabled: !!id,
    refetchInterval: 3000,
    staleTime: 0,
  });
}

export function useJobLogs(id: string, params?: { page?: number; limit?: number; level?: string }) {
  return useQuery({
    queryKey: KEYS.jobLogs(id, params),
    queryFn: () => backupApi.jobs.logs(id, params),
    enabled: !!id,
    staleTime: 5 * 1000,
  });
}

export function useJobStats(id: string) {
  return useQuery({
    queryKey: KEYS.jobStats(id),
    queryFn: () => backupApi.jobs.stats(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJobRequest) => backupApi.jobs.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJobRequest }) => backupApi.jobs.update(id, data),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(KEYS.job(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backupApi.jobs.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: KEYS.job(id) });
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useStartJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backupApi.jobs.start(id),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(KEYS.job(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function usePauseJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backupApi.jobs.pause(id),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(KEYS.job(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useResumeJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backupApi.jobs.resume(id),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(KEYS.job(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backupApi.jobs.cancel(id),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(KEYS.job(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useRetryJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backupApi.jobs.retry(id),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(KEYS.job(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useDownloadJobLog(id: string) {
  return useMutation({
    mutationFn: () => backupApi.jobs.downloadLog(id),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-job-${id}-log.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useDownloadJobReport(id: string) {
  return useMutation({
    mutationFn: () => backupApi.jobs.downloadReport(id),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-job-${id}-report.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useSchedules(params?: { page?: number; limit?: number; accountId?: string }) {
  return useQuery({
    queryKey: [...KEYS.schedules, params],
    queryFn: () => backupApi.schedules.list(params),
    staleTime: 30 * 1000,
  });
}

export function useSchedule(id: string) {
  return useQuery({
    queryKey: KEYS.schedule(id),
    queryFn: () => backupApi.schedules.get(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScheduleRequest) => backupApi.schedules.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.schedules });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleRequest }) =>
      backupApi.schedules.update(id, data),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(KEYS.schedule(id), updated);
      queryClient.invalidateQueries({ queryKey: KEYS.schedules });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backupApi.schedules.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: KEYS.schedule(id) });
      queryClient.invalidateQueries({ queryKey: KEYS.schedules });
    },
  });
}

export function useToggleSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enable }: { id: string; enable: boolean }) =>
      enable ? backupApi.schedules.enable(id) : backupApi.schedules.disable(id),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: KEYS.schedules });
      queryClient.invalidateQueries({ queryKey: KEYS.schedule(id) });
    },
  });
}

export function useNextScheduleRuns(limit?: number) {
  return useQuery({
    queryKey: [...KEYS.nextScheduleRuns, limit],
    queryFn: () => backupApi.schedules.nextRuns({ limit }),
    staleTime: 60 * 1000,
  });
}

export function useHistory(params?: { page?: number; limit?: number; filter?: HistoryFilter }) {
  return useQuery({
    queryKey: [...KEYS.history, params],
    queryFn: () => backupApi.history.list(params),
    staleTime: 30 * 1000,
  });
}

export function useInfiniteHistory(filter?: HistoryFilter) {
  return useInfiniteQuery({
    queryKey: [...KEYS.history, 'infinite', filter],
    queryFn: ({ pageParam }: { pageParam: number }) => backupApi.history.list({ page: pageParam, limit: 20, filter }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 30 * 1000,
  });
}

export function useHistoryItem(id: string) {
  return useQuery({
    queryKey: KEYS.historyItem(id),
    queryFn: () => backupApi.history.get(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useHistoryDetails(id: string) {
  return useQuery({
    queryKey: KEYS.historyDetails(id),
    queryFn: () => backupApi.history.details(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useDeleteHistoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backupApi.history.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: KEYS.historyItem(id) });
      queryClient.invalidateQueries({ queryKey: KEYS.history });
    },
  });
}

export function useExportHistory() {
  return useMutation({
    mutationFn: (filter?: HistoryFilter) => backupApi.history.export(filter),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-history-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useStorageUsage() {
  return useQuery({
    queryKey: KEYS.storageUsage,
    queryFn: backupApi.storage.usage,
    staleTime: 60 * 1000,
  });
}

export function useStorageTrend(params?: { days?: number; granularity?: 'day' | 'week' | 'month' }) {
  return useQuery({
    queryKey: [...KEYS.storageTrend, params],
    queryFn: () => backupApi.storage.trend(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useValidateStorage() {
  return useMutation({
    mutationFn: ({ location, path, credentials }: { location: string; path: string; credentials?: Record<string, string> }) =>
      backupApi.storage.validate(location, path, credentials),
  });
}

export function useStorageSpace() {
  return useMutation({
    mutationFn: ({ location, path, credentials }: { location: string; path: string; credentials?: Record<string, string> }) =>
      backupApi.storage.space(location, path, credentials),
  });
}