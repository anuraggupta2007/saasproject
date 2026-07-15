import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api';
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
  TwoFactorMethod,
} from '../types';

const KEYS = {
  dashboard: ['settings', 'dashboard'] as const,
  profile: ['settings', 'profile'] as const,
  security: ['settings', 'security'] as const,
  sessions: ['settings', 'security', 'sessions'] as const,
  trustedDevices: ['settings', 'security', 'trusted-devices'] as const,
  connectedAccounts: ['settings', 'connected-accounts'] as const,
  apiKeys: ['settings', 'api-keys'] as const,
  notifications: ['settings', 'notifications'] as const,
  appearance: ['settings', 'appearance'] as const,
  languageRegion: ['settings', 'language-region'] as const,
  privacy: ['settings', 'privacy'] as const,
  activity: ['settings', 'activity'] as const,
};

export function useSettingsDashboard() {
  return useQuery({
    queryKey: KEYS.dashboard,
    queryFn: () => settingsApi.dashboard.data(),
    staleTime: 60 * 1000,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: KEYS.profile,
    queryFn: () => settingsApi.profile.get(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProfileUpdateData) => settingsApi.profile.update(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(KEYS.profile, updated);
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => settingsApi.profile.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.profile });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => settingsApi.profile.deleteAvatar(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.profile });
    },
  });
}

export function useSecuritySettings() {
  return useQuery({
    queryKey: KEYS.security,
    queryFn: () => settingsApi.security.get(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordData) => settingsApi.security.changePassword(data),
  });
}

export function useEnable2FA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (method: TwoFactorMethod) => settingsApi.security.enable2FA(method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.security });
    },
  });
}

export function useConfirm2FA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => settingsApi.security.confirm2FA(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.security });
    },
  });
}

export function useDisable2FA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => settingsApi.security.disable2FA(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.security });
    },
  });
}

export function useRegenerateBackupCodes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => settingsApi.security.regenerateBackupCodes(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.security });
    },
  });
}

export function useActiveSessions() {
  return useQuery({
    queryKey: KEYS.sessions,
    queryFn: () => settingsApi.security.sessions(),
    staleTime: 30 * 1000,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.security.revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.sessions });
    },
  });
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => settingsApi.security.revokeAllSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.sessions });
    },
  });
}

export function useConnectedAccounts() {
  return useQuery({
    queryKey: KEYS.connectedAccounts,
    queryFn: () => settingsApi.connectedAccounts.list(),
    staleTime: 30 * 1000,
  });
}

export function useConnectAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) => settingsApi.connectedAccounts.connect(provider),
    onSuccess: (result) => {
      if (result.authUrl) {
        window.open(result.authUrl, '_blank');
      }
    },
  });
}

export function useDisconnectAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.connectedAccounts.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.connectedAccounts });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useReconnectAccount() {
  return useMutation({
    mutationFn: (id: string) => settingsApi.connectedAccounts.reconnect(id),
    onSuccess: (result) => {
      if (result.authUrl) {
        window.open(result.authUrl, '_blank');
      }
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (id: string) => settingsApi.connectedAccounts.testConnection(id),
  });
}

export function useRenameAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      settingsApi.connectedAccounts.rename(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.connectedAccounts });
    },
  });
}

export function useToggleSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      settingsApi.connectedAccounts.toggleSync(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.connectedAccounts });
    },
  });
}

export function useAPIKeys() {
  return useQuery({
    queryKey: KEYS.apiKeys,
    queryFn: () => settingsApi.apiKeys.list(),
    staleTime: 30 * 1000,
  });
}

export function useCreateAPIKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: APIKeyCreateData) => settingsApi.apiKeys.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.apiKeys });
    },
  });
}

export function useRevokeAPIKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.apiKeys.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.apiKeys });
    },
  });
}

export function useRegenerateAPIKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.apiKeys.regenerate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.apiKeys });
    },
  });
}

export function useRenameAPIKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      settingsApi.apiKeys.rename(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.apiKeys });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: KEYS.notifications,
    queryFn: () => settingsApi.notifications.get(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NotificationPreferences) => settingsApi.notifications.update(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(KEYS.notifications, updated);
    },
  });
}

export function useAppearanceSettings() {
  return useQuery({
    queryKey: KEYS.appearance,
    queryFn: () => settingsApi.appearance.get(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateAppearance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AppearanceSettings) => settingsApi.appearance.update(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(KEYS.appearance, updated);
    },
  });
}

export function useLanguageRegionSettings() {
  return useQuery({
    queryKey: KEYS.languageRegion,
    queryFn: () => settingsApi.languageRegion.get(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateLanguageRegion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LanguageRegionSettings) => settingsApi.languageRegion.update(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(KEYS.languageRegion, updated);
    },
  });
}

export function usePrivacySettings() {
  return useQuery({
    queryKey: KEYS.privacy,
    queryFn: () => settingsApi.privacy.get(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdatePrivacy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PrivacySettings) => settingsApi.privacy.update(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(KEYS.privacy, updated);
    },
  });
}

export function useDownloadUserData() {
  return useMutation({
    mutationFn: () => settingsApi.privacy.downloadData(),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'user-data-export.zip';
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useRequestAccountDeletion() {
  return useMutation({
    mutationFn: () => settingsApi.privacy.requestDeletion(),
  });
}

export function useCancelAccountDeletion() {
  return useMutation({
    mutationFn: () => settingsApi.privacy.cancelDeletion(),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (password: string) => settingsApi.account.delete(password),
  });
}

export function useDeactivateAccount() {
  return useMutation({
    mutationFn: (password: string) => settingsApi.account.deactivate(password),
  });
}

export function useExportAccountData() {
  return useMutation({
    mutationFn: () => settingsApi.account.exportData(),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mailsavior-data-${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useActivityLog(params?: { page?: number; limit?: number; category?: string; search?: string }) {
  return useQuery({
    queryKey: [...KEYS.activity, params],
    queryFn: () => settingsApi.activity.list(params),
    staleTime: 30 * 1000,
  });
}
