import apiClient from '@/lib/apiClient';
import type {
  UserProfile,
  ProfileUpdateData,
  SecuritySettings,
  ActiveSession,
  ConnectedAccount,
  APIKey,
  APIKeyCreateData,
  NotificationPreferences,
  AppearanceSettings,
  LanguageRegionSettings,
  PrivacySettings,
  ActivityLogEntry,
  SettingsDashboardData,
  ChangePasswordData,
  TwoFactorSetup,
  TwoFactorMethod,
  PaginatedResponse,
} from '../types';

const BASE = '/api/v1/settings';

export const settingsApi = {
  dashboard: {
    data: () =>
      apiClient.get<SettingsDashboardData>(`${BASE}/dashboard`).then((res) => res.data),
  },

  profile: {
    get: () =>
      apiClient.get<UserProfile>(`${BASE}/profile`).then((res) => res.data),
    update: (data: ProfileUpdateData) =>
      apiClient.put<UserProfile>(`${BASE}/profile`, data).then((res) => res.data),
    uploadAvatar: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return apiClient
        .post<{ url: string }>(`${BASE}/profile/avatar`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((res) => res.data);
    },
    deleteAvatar: () =>
      apiClient.delete(`${BASE}/profile/avatar`).then((res) => res.data),
  },

  security: {
    get: () =>
      apiClient.get<SecuritySettings>(`${BASE}/security`).then((res) => res.data),
    changePassword: (data: ChangePasswordData) =>
      apiClient.post(`${BASE}/security/password`, data).then((res) => res.data),
    enable2FA: (method: TwoFactorMethod) =>
      apiClient
        .post<TwoFactorSetup>(`${BASE}/security/2fa/enable`, { method })
        .then((res) => res.data),
    confirm2FA: (code: string) =>
      apiClient.post(`${BASE}/security/2fa/confirm`, { code }).then((res) => res.data),
    disable2FA: (code: string) =>
      apiClient.post(`${BASE}/security/2fa/disable`, { code }).then((res) => res.data),
    regenerateBackupCodes: () =>
      apiClient
        .post<{ backupCodes: string[] }>(`${BASE}/security/2fa/backup-codes`)
        .then((res) => res.data),
    sessions: () =>
      apiClient.get<ActiveSession[]>(`${BASE}/security/sessions`).then((res) => res.data),
    revokeSession: (id: string) =>
      apiClient.delete(`${BASE}/security/sessions/${id}`).then((res) => res.data),
    revokeAllSessions: () =>
      apiClient.delete(`${BASE}/security/sessions`).then((res) => res.data),
    trustedDevices: () =>
      apiClient.get(`${BASE}/security/trusted-devices`).then((res) => res.data),
    removeTrustedDevice: (id: string) =>
      apiClient.delete(`${BASE}/security/trusted-devices/${id}`).then((res) => res.data),
    updateSessionTimeout: (minutes: number) =>
      apiClient.put(`${BASE}/security/session-timeout`, { minutes }).then((res) => res.data),
  },

  connectedAccounts: {
    list: () =>
      apiClient.get<ConnectedAccount[]>(`${BASE}/connected-accounts`).then((res) => res.data),
    connect: (provider: string) =>
      apiClient
        .get<{ authUrl: string }>(`${BASE}/connected-accounts/${provider}/auth`)
        .then((res) => res.data),
    disconnect: (id: string) =>
      apiClient.delete(`${BASE}/connected-accounts/${id}`).then((res) => res.data),
    reconnect: (id: string) =>
      apiClient
        .get<{ authUrl: string }>(`${BASE}/connected-accounts/${id}/reauth`)
        .then((res) => res.data),
    testConnection: (id: string) =>
      apiClient
        .post<{ success: boolean; message: string }>(`${BASE}/connected-accounts/${id}/test`)
        .then((res) => res.data),
    rename: (id: string, name: string) =>
      apiClient
        .put<ConnectedAccount>(`${BASE}/connected-accounts/${id}`, { displayName: name })
        .then((res) => res.data),
    toggleSync: (id: string, enabled: boolean) =>
      apiClient
        .put<ConnectedAccount>(`${BASE}/connected-accounts/${id}/sync`, { enabled })
        .then((res) => res.data),
  },

  apiKeys: {
    list: () =>
      apiClient.get<APIKey[]>(`${BASE}/api-keys`).then((res) => res.data),
    create: (data: APIKeyCreateData) =>
      apiClient.post<APIKey>(`${BASE}/api-keys`, data).then((res) => res.data),
    revoke: (id: string) =>
      apiClient.delete(`${BASE}/api-keys/${id}`).then((res) => res.data),
    regenerate: (id: string) =>
      apiClient.post<APIKey>(`${BASE}/api-keys/${id}/regenerate`).then((res) => res.data),
    rename: (id: string, name: string) =>
      apiClient.put<APIKey>(`${BASE}/api-keys/${id}`, { name }).then((res) => res.data),
  },

  notifications: {
    get: () =>
      apiClient.get<NotificationPreferences>(`${BASE}/notifications`).then((res) => res.data),
    update: (data: NotificationPreferences) =>
      apiClient.put<NotificationPreferences>(`${BASE}/notifications`, data).then((res) => res.data),
  },

  appearance: {
    get: () =>
      apiClient.get<AppearanceSettings>(`${BASE}/appearance`).then((res) => res.data),
    update: (data: AppearanceSettings) =>
      apiClient.put<AppearanceSettings>(`${BASE}/appearance`, data).then((res) => res.data),
  },

  languageRegion: {
    get: () =>
      apiClient.get<LanguageRegionSettings>(`${BASE}/language-region`).then((res) => res.data),
    update: (data: LanguageRegionSettings) =>
      apiClient
        .put<LanguageRegionSettings>(`${BASE}/language-region`, data)
        .then((res) => res.data),
  },

  privacy: {
    get: () =>
      apiClient.get<PrivacySettings>(`${BASE}/privacy`).then((res) => res.data),
    update: (data: PrivacySettings) =>
      apiClient.put<PrivacySettings>(`${BASE}/privacy`, data).then((res) => res.data),
    downloadData: () =>
      apiClient
        .get<Blob>(`${BASE}/privacy/download`, { responseType: 'blob' })
        .then((res) => res.data),
    requestDeletion: () =>
      apiClient.post(`${BASE}/privacy/delete-request`).then((res) => res.data),
    cancelDeletion: () =>
      apiClient.post(`${BASE}/privacy/cancel-delete-request`).then((res) => res.data),
  },

  account: {
    delete: (password: string) =>
      apiClient.post(`${BASE}/account/delete`, { password }).then((res) => res.data),
    deactivate: (password: string) =>
      apiClient.post(`${BASE}/account/deactivate`, { password }).then((res) => res.data),
    exportData: () =>
      apiClient.get<Blob>(`${BASE}/account/export`, { responseType: 'blob' }).then((res) => res.data),
  },

  activity: {
    list: (params?: { page?: number; limit?: number; category?: string; search?: string }) =>
      apiClient
        .get<PaginatedResponse<ActivityLogEntry>>(`${BASE}/activity`, { params })
        .then((res) => res.data),
  },
};
