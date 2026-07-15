import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import apiClient from '@/lib/apiClient';
import type { Notification } from '@/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;
}

interface NotificationActions {
  fetchNotifications: (page?: number, limit?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  devtools(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isOpen: false,
      isLoading: false,

      fetchNotifications: async (page = 1, limit = 20) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.get<{ items: Notification[]; total: number }>('/api/v1/notifications/', {
            params: { page, limit },
          });
          set({ notifications: response.data.items, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      fetchUnreadCount: async () => {
        try {
          const response = await apiClient.get<{ count: number }>('/api/v1/notifications/unread-count');
          set({ unreadCount: response.data.count });
        } catch {
          // silently fail
        }
      },

      markRead: async (id: string) => {
        try {
          await apiClient.patch(`/api/v1/notifications/${id}/read`);
          set((s) => ({
            notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
            unreadCount: Math.max(0, s.unreadCount - 1),
          }));
        } catch {
          // silently fail
        }
      },

      markAllRead: async () => {
        try {
          await apiClient.post('/api/v1/notifications/read-all');
          set((s) => ({
            notifications: s.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
          }));
        } catch {
          // silently fail
        }
      },

      addNotification: (notification) =>
        set((s) => ({
          notifications: [notification, ...s.notifications],
          unreadCount: s.unreadCount + (notification.read ? 0 : 1),
        })),

      removeNotification: (id) =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
          unreadCount: s.unreadCount - (s.notifications.find((n) => n.id === id && !n.read) ? 1 : 0),
        })),

      setOpen: (open) => set({ isOpen: open }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      clear: () => set({ notifications: [], unreadCount: 0 }),
    }),
    { name: 'NotificationStore' }
  )
);
