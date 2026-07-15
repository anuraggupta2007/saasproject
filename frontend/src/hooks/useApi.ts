import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import type { User, Notification, ApiResponse, PaginatedResponse } from '@/types';

// ─── Auth Hooks ──────────────────────────────────────────────────────────────

export const AUTH_KEYS = {
  me: ['auth', 'me'] as const,
  profile: ['auth', 'profile'] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_KEYS.me,
    queryFn: async () => {
      const res = await apiClient.get<User>('/api/v1/auth/me');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

// ─── Profile Hooks ───────────────────────────────────────────────────────────

export const PROFILE_KEYS = {
  profile: ['profile'] as const,
  avatar: ['profile', 'avatar'] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEYS.profile,
    queryFn: async () => {
      const res = await apiClient.get<User>('/api/v1/users/me');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: async (data: { full_name?: string; avatar?: string }) => {
      const res = await apiClient.patch<User>('/api/v1/users/me', data);
      return res.data;
    },
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: PROFILE_KEYS.profile });
      setUser(user);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiClient.post('/api/v1/users/me/change-password', {
        current_password: data.currentPassword,
        new_password: data.newPassword,
      });
      return res.data;
    },
  });
}

// ─── Notification Hooks ──────────────────────────────────────────────────────

export const NOTIFICATION_KEYS = {
  list: ['notifications'] as const,
  count: ['notifications', 'count'] as const,
};

export function useNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: [...NOTIFICATION_KEYS.list, { page, limit }],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Notification>>('/api/v1/notifications/', {
        params: { page, limit },
      });
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.count,
    queryFn: async () => {
      const res = await apiClient.get<{ count: number }>('/api/v1/notifications/unread-count');
      return res.data.count;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const markRead = useNotificationStore((s) => s.markRead);

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/api/v1/notifications/${id}/read`);
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.list });
      qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.count });
      markRead(id);
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/notifications/read-all');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.list });
      qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.count });
      markAllRead();
    },
  });
}

// ─── Dashboard Hooks ─────────────────────────────────────────────────────────

export const DASHBOARD_KEYS = {
  stats: ['dashboard', 'stats'] as const,
  activity: ['dashboard', 'activity'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.stats,
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/analytics/dashboard');
      return res.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}

// ─── Generic Paginated List Hook ─────────────────────────────────────────────

export function usePaginatedList<T>(
  queryKey: string[],
  endpoint: string,
  params?: Record<string, unknown>
) {
  return useQuery({
    queryKey: [...queryKey, params],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<T>>(endpoint, { params });
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

// ─── Generic Mutation Hook ───────────────────────────────────────────────────

export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    invalidateKeys?: string[][];
    onSuccess?: (data: TData) => void;
  }
) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      options?.invalidateKeys?.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      options?.onSuccess?.(data);
    },
  });
}
