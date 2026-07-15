// ─── Re-export all existing hooks ────────────────────────────────────────────
export { useFileUpload } from './useFileUpload';
export { useClipboard } from './useClipboard';
export { useDebounce } from './useDebounce';
export { useLocalStorage } from './useLocalStorage';
export { useOutsideClick } from './useOutsideClick';
export { usePagination } from './usePagination';
export { useSessionTimeout } from './useSessionTimeout';
export { useWebSocket } from './useWebSocket';
export { useWindowSize } from './useWindowSize';
export { useAuth } from './useAuth';
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

// ─── Utility Hooks ───────────────────────────────────────────────────────────
export {
  useDebounceFn,
  useThrottle,
  useClickOutside,
  useClipboardUtil,
  useWindowSizeUtil,
  useLocalStorageUtil,
  useOnlineStatus,
  useMediaQuery,
} from './utilityHooks';
