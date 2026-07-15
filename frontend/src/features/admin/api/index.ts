import apiClient from '@/lib/apiClient';
import type {
  AdminUser,
  UserUpdateData,
  AdminSubscription,
  AdminLicense,
  AdminPayment,
  AdminJob,
  SupportTicket,
  TicketMessage,
  TicketReplyData,
  AdminAnalytics,
  SystemHealth,
  AuditLogEntry,
  AdminNotification,
  NotificationCreateData,
  AppSettings,
  RoleDefinition,
  AdminError,
  DashboardStats,
  PaginatedResponse,
} from '../types';

const BASE = '/api/v1/admin';

export const adminApi = {
  dashboard: {
    getStats: () =>
      apiClient.get<DashboardStats>(`${BASE}/stats`).then((res) => res.data),
  },

  users: {
    list: (params?: { page?: number; limit?: number; search?: string; role?: string; status?: string; plan?: string; sort?: string; order?: string }) =>
      apiClient.get<PaginatedResponse<AdminUser>>(`${BASE}/users`, { params }).then((res) => res.data),
    get: (id: string) =>
      apiClient.get<AdminUser>(`${BASE}/users/${id}`).then((res) => res.data),
    update: (id: string, data: UserUpdateData) =>
      apiClient.patch<AdminUser>(`${BASE}/users/${id}`, data).then((res) => res.data),
    delete: (id: string) =>
      apiClient.delete(`${BASE}/users/${id}`).then((res) => res.data),
    resetPassword: (id: string) =>
      apiClient.post(`${BASE}/users/${id}/reset-password`).then((res) => res.data),
    verifyEmail: (id: string) =>
      apiClient.post(`${BASE}/users/${id}/verify-email`).then((res) => res.data),
    suspend: (id: string) =>
      apiClient.post(`${BASE}/users/${id}/suspend`).then((res) => res.data),
    reactivate: (id: string) =>
      apiClient.post(`${BASE}/users/${id}/reactivate`).then((res) => res.data),
    bulkAction: (action: string, userIds: string[]) =>
      apiClient.post(`${BASE}/users/bulk`, { action, userIds }).then((res) => res.data),
  },

  subscriptions: {
    list: (params?: { page?: number; limit?: number; status?: string; plan?: string }) =>
      apiClient.get<PaginatedResponse<AdminSubscription>>(`${BASE}/subscriptions`, { params }).then((res) => res.data),
    cancel: (id: string) =>
      apiClient.post(`${BASE}/subscriptions/${id}/cancel`).then((res) => res.data),
    extend: (id: string, days: number) =>
      apiClient.post(`${BASE}/subscriptions/${id}/extend`, { days }).then((res) => res.data),
  },

  licenses: {
    list: (params?: { page?: number; limit?: number; status?: string }) =>
      apiClient.get<PaginatedResponse<AdminLicense>>(`${BASE}/licenses`, { params }).then((res) => res.data),
    activate: (id: string) =>
      apiClient.post(`${BASE}/licenses/${id}/activate`).then((res) => res.data),
    deactivate: (id: string) =>
      apiClient.post(`${BASE}/licenses/${id}/deactivate`).then((res) => res.data),
    extend: (id: string, days: number) =>
      apiClient.post(`${BASE}/licenses/${id}/extend`, { days }).then((res) => res.data),
  },

  payments: {
    list: (params?: { page?: number; limit?: number; status?: string; provider?: string; search?: string }) =>
      apiClient.get<PaginatedResponse<AdminPayment>>(`${BASE}/payments`, { params }).then((res) => res.data),
    get: (id: string) =>
      apiClient.get<AdminPayment>(`${BASE}/payments/${id}`).then((res) => res.data),
    refund: (id: string, amount?: number) =>
      apiClient.post(`${BASE}/payments/${id}/refund`, { amount }).then((res) => res.data),
    export: (params?: { startDate?: string; endDate?: string; status?: string }) =>
      apiClient.get(`${BASE}/payments/export`, { params, responseType: 'blob' as const }).then((res) => res.data),
  },

  jobs: {
    list: (params?: { page?: number; limit?: number; type?: string; status?: string; userId?: string }) =>
      apiClient.get<PaginatedResponse<AdminJob>>(`${BASE}/jobs`, { params }).then((res) => res.data),
    retry: (id: string) =>
      apiClient.post(`${BASE}/jobs/${id}/retry`).then((res) => res.data),
    cancel: (id: string) =>
      apiClient.post(`${BASE}/jobs/${id}/cancel`).then((res) => res.data),
    getLogs: (id: string) =>
      apiClient.get<{ logs: string[] }>(`${BASE}/jobs/${id}/logs`).then((res) => res.data),
  },

  support: {
    listTickets: (params?: { page?: number; limit?: number; status?: string; priority?: string; assignedTo?: string }) =>
      apiClient.get<PaginatedResponse<SupportTicket>>(`${BASE}/support/tickets`, { params }).then((res) => res.data),
    getTicket: (id: string) =>
      apiClient.get<SupportTicket>(`${BASE}/support/tickets/${id}`).then((res) => res.data),
    getMessages: (id: string) =>
      apiClient.get<TicketMessage[]>(`${BASE}/support/tickets/${id}/messages`).then((res) => res.data),
    reply: (id: string, data: TicketReplyData) =>
      apiClient.post<TicketMessage>(`${BASE}/support/tickets/${id}/reply`, data).then((res) => res.data),
    assign: (id: string, assigneeId: string) =>
      apiClient.post(`${BASE}/support/tickets/${id}/assign`, { assigneeId }).then((res) => res.data),
    changePriority: (id: string, priority: string) =>
      apiClient.patch(`${BASE}/support/tickets/${id}/priority`, { priority }).then((res) => res.data),
    resolve: (id: string) =>
      apiClient.post(`${BASE}/support/tickets/${id}/resolve`).then((res) => res.data),
    close: (id: string) =>
      apiClient.post(`${BASE}/support/tickets/${id}/close`).then((res) => res.data),
  },

  analytics: {
    get: (params?: { startDate?: string; endDate?: string; granularity?: string }) =>
      apiClient.get<AdminAnalytics>(`${BASE}/analytics`, { params }).then((res) => res.data),
  },

  system: {
    getHealth: () =>
      apiClient.get<SystemHealth>(`${BASE}/system/health`).then((res) => res.data),
  },

  audit: {
    list: (params?: { page?: number; limit?: number; userId?: string; action?: string; resource?: string; startDate?: string; endDate?: string }) =>
      apiClient.get<PaginatedResponse<AuditLogEntry>>(`${BASE}/audit`, { params }).then((res) => res.data),
    export: (params?: { startDate?: string; endDate?: string }) =>
      apiClient.get(`${BASE}/audit/export`, { params, responseType: 'blob' as const }).then((res) => res.data),
  },

  notifications: {
    list: (params?: { page?: number; limit?: number; status?: string }) =>
      apiClient.get<PaginatedResponse<AdminNotification>>(`${BASE}/notifications`, { params }).then((res) => res.data),
    create: (data: NotificationCreateData) =>
      apiClient.post<AdminNotification>(`${BASE}/notifications`, data).then((res) => res.data),
    send: (id: string) =>
      apiClient.post(`${BASE}/notifications/${id}/send`).then((res) => res.data),
    delete: (id: string) =>
      apiClient.delete(`${BASE}/notifications/${id}`).then((res) => res.data),
  },

  settings: {
    get: () =>
      apiClient.get<AppSettings>(`${BASE}/settings`).then((res) => res.data),
    update: (section: string, data: Record<string, unknown>) =>
      apiClient.patch<AppSettings>(`${BASE}/settings/${section}`, data).then((res) => res.data),
  },

  roles: {
    list: () =>
      apiClient.get<RoleDefinition[]>(`${BASE}/roles`).then((res) => res.data),
    create: (data: { name: string; description: string; permissions: string[] }) =>
      apiClient.post<RoleDefinition>(`${BASE}/roles`, data).then((res) => res.data),
    update: (id: string, data: { name?: string; description?: string; permissions?: string[] }) =>
      apiClient.patch<RoleDefinition>(`${BASE}/roles/${id}`, data).then((res) => res.data),
    delete: (id: string) =>
      apiClient.delete(`${BASE}/roles/${id}`).then((res) => res.data),
  },

  errors: {
    list: (params?: { page?: number; limit?: number; type?: string; status?: string }) =>
      apiClient.get<PaginatedResponse<AdminError>>(`${BASE}/errors`, { params }).then((res) => res.data),
    update: (id: string, data: { status?: string; assignedTo?: string }) =>
      apiClient.patch<AdminError>(`${BASE}/errors/${id}`, data).then((res) => res.data),
    archive: (id: string) =>
      apiClient.post(`${BASE}/errors/${id}/archive`).then((res) => res.data),
  },
};
