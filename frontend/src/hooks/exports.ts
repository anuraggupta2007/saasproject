// ─── Existing Hooks (re-exported) ────────────────────────────────────────────
export { useFileUpload } from './useFileUpload';
export { useClipboard } from './useClipboard';
export { useDebounce } from './useDebounce';
export { useLocalStorage } from './useLocalStorage';
export { useOutsideClick } from './useOutsideClick';
export { usePagination } from './usePagination';
export { useSessionTimeout } from './useSessionTimeout';
export { useWebSocket } from './useWebSocket';
export { useWindowSize } from './useWindowSize';

// ─── Auth Hook ───────────────────────────────────────────────────────────────
export { useAuth } from './useAuth';

// ─── API Hooks ───────────────────────────────────────────────────────────────
export {
  useCurrentUser,
  useProfile,
  useUpdateProfile,
  useChangePassword,
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllRead,
  useDashboardStats,
  usePaginatedList,
  useApiMutation,
} from './useApi';

// ─── Utility Hooks (from hooks/index.ts) ─────────────────────────────────────
export { useDebounce as useDebounceFn } from './index';
export { useThrottle } from './index';
export { useClickOutside } from './index';
export { useClipboard as useClipboardUtil } from './index';
export { useWindowSize as useWindowSizeUtil } from './index';
export { useLocalStorage as useLocalStorageUtil } from './index';
export { useOnlineStatus } from './index';
export { useMediaQuery } from './index';
