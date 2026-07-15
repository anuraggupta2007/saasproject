import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api';
import type {
  UserUpdateData,
  NotificationCreateData,
  TicketReplyData,
} from '../types';

const KEYS = {
  dashboard: ['admin', 'dashboard'] as const,
  users: ['admin', 'users'] as const,
  user: (id: string) => ['admin', 'users', id] as const,
  subscriptions: ['admin', 'subscriptions'] as const,
  licenses: ['admin', 'licenses'] as const,
  payments: ['admin', 'payments'] as const,
  payment: (id: string) => ['admin', 'payments', id] as const,
  jobs: ['admin', 'jobs'] as const,
  jobLogs: (id: string) => ['admin', 'jobs', id, 'logs'] as const,
  tickets: ['admin', 'support', 'tickets'] as const,
  ticket: (id: string) => ['admin', 'support', 'tickets', id] as const,
  ticketMessages: (id: string) => ['admin', 'support', 'tickets', id, 'messages'] as const,
  analytics: ['admin', 'analytics'] as const,
  system: ['admin', 'system'] as const,
  audit: ['admin', 'audit'] as const,
  notifications: ['admin', 'notifications'] as const,
  settings: ['admin', 'settings'] as const,
  roles: ['admin', 'roles'] as const,
  errors: ['admin', 'errors'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: KEYS.dashboard,
    queryFn: () => adminApi.dashboard.getStats(),
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useAdminUsers(params?: { page?: number; limit?: number; search?: string; role?: string; status?: string; plan?: string; sort?: string; order?: string }) {
  return useQuery({
    queryKey: [...KEYS.users, params],
    queryFn: () => adminApi.users.list(params),
    staleTime: 30 * 1000,
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: KEYS.user(id),
    queryFn: () => adminApi.users.get(id),
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdateData }) => adminApi.users.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.users });
      qc.invalidateQueries({ queryKey: KEYS.user(id) });
      qc.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.users.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users });
      qc.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (id: string) => adminApi.users.resetPassword(id),
  });
}

export function useVerifyUserEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.users.verifyEmail(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.users }); },
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.users.suspend(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users });
      qc.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.users.reactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users });
      qc.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useBulkUserAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, userIds }: { action: string; userIds: string[] }) => adminApi.users.bulkAction(action, userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users });
      qc.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useAdminSubscriptions(params?: { page?: number; limit?: number; status?: string; plan?: string }) {
  return useQuery({
    queryKey: [...KEYS.subscriptions, params],
    queryFn: () => adminApi.subscriptions.list(params),
    staleTime: 30 * 1000,
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.subscriptions.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.subscriptions }); qc.invalidateQueries({ queryKey: KEYS.dashboard }); },
  });
}

export function useExtendSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => adminApi.subscriptions.extend(id, days),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.subscriptions }); },
  });
}

export function useAdminLicenses(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: [...KEYS.licenses, params],
    queryFn: () => adminApi.licenses.list(params),
    staleTime: 30 * 1000,
  });
}

export function useActivateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.licenses.activate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.licenses }); qc.invalidateQueries({ queryKey: KEYS.dashboard }); },
  });
}

export function useDeactivateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.licenses.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.licenses }); qc.invalidateQueries({ queryKey: KEYS.dashboard }); },
  });
}

export function useExtendLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => adminApi.licenses.extend(id, days),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.licenses }); },
  });
}

export function useAdminPayments(params?: { page?: number; limit?: number; status?: string; provider?: string; search?: string }) {
  return useQuery({
    queryKey: [...KEYS.payments, params],
    queryFn: () => adminApi.payments.list(params),
    staleTime: 30 * 1000,
  });
}

export function useRefundPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount?: number }) => adminApi.payments.refund(id, amount),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.payments }); qc.invalidateQueries({ queryKey: KEYS.dashboard }); },
  });
}

export function useExportPayments() {
  return useMutation({
    mutationFn: (params?: { startDate?: string; endDate?: string; status?: string }) => adminApi.payments.export(params),
    onSuccess: (response) => {
      const blob = new Blob([response.data as BlobPart]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useAdminJobs(params?: { page?: number; limit?: number; type?: string; status?: string; userId?: string }) {
  return useQuery({
    queryKey: [...KEYS.jobs, params],
    queryFn: () => adminApi.jobs.list(params),
    staleTime: 15 * 1000,
    refetchInterval: 10 * 1000,
  });
}

export function useRetryJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.jobs.retry(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.jobs }); },
  });
}

export function useCancelJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.jobs.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.jobs }); },
  });
}

export function useJobLogs(id: string) {
  return useQuery({
    queryKey: KEYS.jobLogs(id),
    queryFn: () => adminApi.jobs.getLogs(id),
    enabled: !!id,
    staleTime: 5 * 1000,
  });
}

export function useSupportTickets(params?: { page?: number; limit?: number; status?: string; priority?: string; assignedTo?: string }) {
  return useQuery({
    queryKey: [...KEYS.tickets, params],
    queryFn: () => adminApi.support.listTickets(params),
    staleTime: 30 * 1000,
  });
}

export function useSupportTicket(id: string) {
  return useQuery({
    queryKey: KEYS.ticket(id),
    queryFn: () => adminApi.support.getTicket(id),
    enabled: !!id,
  });
}

export function useTicketMessages(id: string) {
  return useQuery({
    queryKey: KEYS.ticketMessages(id),
    queryFn: () => adminApi.support.getMessages(id),
    enabled: !!id,
  });
}

export function useReplyTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TicketReplyData }) => adminApi.support.reply(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.ticketMessages(id) });
      qc.invalidateQueries({ queryKey: KEYS.tickets });
    },
  });
}

export function useAssignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string }) => adminApi.support.assign(id, assigneeId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.tickets }); },
  });
}

export function useChangeTicketPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: string }) => adminApi.support.changePriority(id, priority),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.tickets }); },
  });
}

export function useResolveTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.support.resolve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.tickets }); },
  });
}

export function useCloseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.support.close(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.tickets }); },
  });
}

export function useAdminAnalytics(params?: { startDate?: string; endDate?: string; granularity?: string }) {
  return useQuery({
    queryKey: [...KEYS.analytics, params],
    queryFn: () => adminApi.analytics.get(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: KEYS.system,
    queryFn: () => adminApi.system.getHealth(),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useAuditLogs(params?: { page?: number; limit?: number; userId?: string; action?: string; resource?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: [...KEYS.audit, params],
    queryFn: () => adminApi.audit.list(params),
    staleTime: 30 * 1000,
  });
}

export function useExportAuditLogs() {
  return useMutation({
    mutationFn: (params?: { startDate?: string; endDate?: string }) => adminApi.audit.export(params),
    onSuccess: (response) => {
      const blob = new Blob([response.data as BlobPart]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useAdminNotifications(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: [...KEYS.notifications, params],
    queryFn: () => adminApi.notifications.list(params),
    staleTime: 30 * 1000,
  });
}

export function useCreateNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NotificationCreateData) => adminApi.notifications.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.notifications }); },
  });
}

export function useSendNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.notifications.send(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.notifications }); },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.notifications.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.notifications }); },
  });
}

export function useAppSettings() {
  return useQuery({
    queryKey: KEYS.settings,
    queryFn: () => adminApi.settings.get(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ section, data }: { section: string; data: Record<string, unknown> }) => adminApi.settings.update(section, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.settings }); },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: KEYS.roles,
    queryFn: () => adminApi.roles.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description: string; permissions: string[] }) => adminApi.roles.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.roles }); },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; permissions?: string[] } }) => adminApi.roles.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.roles }); },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.roles.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.roles }); },
  });
}

export function useAdminErrors(params?: { page?: number; limit?: number; type?: string; status?: string }) {
  return useQuery({
    queryKey: [...KEYS.errors, params],
    queryFn: () => adminApi.errors.list(params),
    staleTime: 30 * 1000,
  });
}

export function useUpdateError() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; assignedTo?: string } }) => adminApi.errors.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.errors }); },
  });
}

export function useArchiveError() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.errors.archive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.errors }); },
  });
}
