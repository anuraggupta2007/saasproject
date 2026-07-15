import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';

interface UIState {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  searchOpen: boolean;
  commandPaletteOpen: boolean;
  isOnline: boolean;
  isMobileMenuOpen: boolean;
  notificationPanelOpen: boolean;
}

interface UIActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSearchOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setOnline: (online: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setNotificationPanelOpen: (open: boolean) => void;
  reset: () => void;
}

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'dark' | 'light' {
  return theme === 'system' ? getSystemTheme() : theme;
}

function applyTheme(resolved: 'dark' | 'light'): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add(resolved);
}

const initialState: UIState = {
  theme: 'dark',
  resolvedTheme: 'dark',
  sidebarOpen: false,
  sidebarCollapsed: false,
  searchOpen: false,
  commandPaletteOpen: false,
  isOnline: true,
  isMobileMenuOpen: false,
  notificationPanelOpen: false,
};

export const useUIStore = create<UIState & UIActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setTheme: (theme) => {
          const resolved = resolveTheme(theme);
          applyTheme(resolved);
          set({ theme, resolvedTheme: resolved });
        },

        toggleTheme: () => {
          const next: Theme = get().theme === 'dark' ? 'light' : get().theme === 'light' ? 'system' : 'dark';
          const resolved = resolveTheme(next);
          applyTheme(resolved);
          set({ theme: next, resolvedTheme: resolved });
        },

        toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
        setSearchOpen: (open) => set({ searchOpen: open }),
        setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
        setOnline: (online) => set({ isOnline: online }),
        setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
        setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),
        reset: () => set(initialState),
      }),
      {
        name: 'mailsavior-ui',
        partialize: (s) => ({ theme: s.theme, sidebarCollapsed: s.sidebarCollapsed }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            const resolved = resolveTheme(state.theme);
            applyTheme(resolved);
            state.resolvedTheme = resolved;
          }
        },
      }
    ),
    { name: 'UIStore' }
  )
);
