import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import apiClient, { setAccessToken, clearTokens } from '@/lib/apiClient';
import type { User, AuthTokens, UserRole } from '@/types';

export type Permission = string;

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  roles: UserRole[];
  permissions: Permission[];
  lastActivity: number;
}

interface AuthActions {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  updateProfile: (updates: Partial<User>) => void;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  updateLastActivity: () => void;
  checkSessionTimeout: (timeoutMs?: number) => boolean;
  fetchUser: () => Promise<void>;
  reset: () => void;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  roles: [],
  permissions: [],
  lastActivity: Date.now(),
};

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        login: async (email, password, rememberMe = false) => {
          set({ isLoading: true });
          try {
            const response = await apiClient.post<{ user: User; access_token: string; refresh_token: string }>('/api/v1/auth/login', {
              email, password, remember_me: rememberMe,
            });
            const { user, access_token, refresh_token } = response.data;
            setAccessToken(access_token);
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              roles: [user.role],
              permissions: [],
              lastActivity: Date.now(),
            });
          } catch (error) {
            set({ isLoading: false });
            throw error;
          }
        },

        register: async (name, email, password) => {
          set({ isLoading: true });
          try {
            const response = await apiClient.post<{ user: User; access_token: string }>('/api/v1/auth/register', {
              name, email, password,
            });
            const { user, access_token } = response.data;
            setAccessToken(access_token);
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              roles: [user.role],
              permissions: [],
              lastActivity: Date.now(),
            });
          } catch (error) {
            set({ isLoading: false });
            throw error;
          }
        },

        logout: async () => {
          try {
            await apiClient.post('/api/v1/auth/logout');
          } catch {
            // Logout even if API call fails
          } finally {
            clearTokens();
            set(initialState);
          }
        },

        refreshAuth: async () => {
          try {
            const response = await apiClient.post<{ access_token: string }>('/api/v1/auth/refresh');
            setAccessToken(response.data.access_token);
            set({ lastActivity: Date.now() });
            return true;
          } catch {
            clearTokens();
            set(initialState);
            return false;
          }
        },

        setUser: (user) =>
          set({ user, isAuthenticated: true, roles: [user.role], lastActivity: Date.now() }),

        setTokens: (tokens) => {
          setAccessToken(tokens.accessToken);
          set({ lastActivity: Date.now() });
        },

        updateProfile: (updates) =>
          set((s) => ({ user: s.user ? { ...s.user, ...updates } : null })),

        hasRole: (role) => get().roles.includes(role),
        hasPermission: (permission) => get().permissions.includes(permission),
        hasAnyRole: (roles) => roles.some((r) => get().roles.includes(r)),

        updateLastActivity: () => set({ lastActivity: Date.now() }),

        checkSessionTimeout: (timeoutMs = 30 * 60 * 1000) =>
          Date.now() - get().lastActivity > timeoutMs,

        fetchUser: async () => {
          try {
            const response = await apiClient.get<User>('/api/v1/auth/me');
            set({
              user: response.data,
              isAuthenticated: true,
              roles: [response.data.role],
              lastActivity: Date.now(),
            });
          } catch {
            set({ isLoading: false });
          }
        },

        reset: () => {
          clearTokens();
          set(initialState);
        },
      }),
      {
        name: 'mailsavior-auth',
        partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
      }
    ),
    { name: 'AuthStore' }
  )
);

export const selectUser = (s: AuthState & AuthActions) => s.user;
export const selectIsAuthenticated = (s: AuthState & AuthActions) => s.isAuthenticated;
export const selectRoles = (s: AuthState & AuthActions) => s.roles;
