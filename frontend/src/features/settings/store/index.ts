import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type {
  Theme,
  AccentColor,
  LayoutDensity,
  SidebarStyle,
  FontSize,
  DateFormat,
  TimeFormat,
} from '../types';

interface SettingsState {
  activeSection: string;
  sidebarCollapsed: boolean;
  formDirty: boolean;
  avatarPreview: string | null;
  preferences: {
    theme: Theme;
    accentColor: AccentColor;
    density: LayoutDensity;
    sidebar: SidebarStyle;
    fontSize: FontSize;
  };
  ui: {
    showDeleteDialog: boolean;
    showPasswordDialog: boolean;
    show2FADialog: boolean;
    showDisconnectDialog: boolean;
    selectedAccountId: string | null;
    selectedSessionId: string | null;
    selectedApiKeyId: string | null;
  };
}

interface SettingsActions {
  setActiveSection: (section: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setFormDirty: (dirty: boolean) => void;
  setAvatarPreview: (preview: string | null) => void;

  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  setDensity: (density: LayoutDensity) => void;
  setSidebar: (style: SidebarStyle) => void;
  setFontSize: (size: FontSize) => void;

  setShowDeleteDialog: (show: boolean) => void;
  setShowPasswordDialog: (show: boolean) => void;
  setShow2FADialog: (show: boolean) => void;
  setShowDisconnectDialog: (show: boolean) => void;
  setSelectedAccountId: (id: string | null) => void;
  setSelectedSessionId: (id: string | null) => void;
  setSelectedApiKeyId: (id: string | null) => void;

  reset: () => void;
}

const initialUI = {
  showDeleteDialog: false,
  showPasswordDialog: false,
  show2FADialog: false,
  showDisconnectDialog: false,
  selectedAccountId: null,
  selectedSessionId: null,
  selectedApiKeyId: null,
};

const initialState: SettingsState = {
  activeSection: 'profile',
  sidebarCollapsed: false,
  formDirty: false,
  avatarPreview: null,
  preferences: {
    theme: 'dark',
    accentColor: 'brand',
    density: 'comfortable',
    sidebar: 'expanded',
    fontSize: 'medium',
  },
  ui: initialUI,
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setActiveSection: (activeSection) => set({ activeSection }),
        setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
        setFormDirty: (formDirty) => set({ formDirty }),
        setAvatarPreview: (avatarPreview) => set({ avatarPreview }),

        setTheme: (theme) =>
          set((state) => ({
            preferences: { ...state.preferences, theme },
          })),
        setAccentColor: (accentColor) =>
          set((state) => ({
            preferences: { ...state.preferences, accentColor },
          })),
        setDensity: (density) =>
          set((state) => ({
            preferences: { ...state.preferences, density },
          })),
        setSidebar: (sidebar) =>
          set((state) => ({
            preferences: { ...state.preferences, sidebar },
          })),
        setFontSize: (fontSize) =>
          set((state) => ({
            preferences: { ...state.preferences, fontSize },
          })),

        setShowDeleteDialog: (showDeleteDialog) =>
          set((state) => ({ ui: { ...state.ui, showDeleteDialog } })),
        setShowPasswordDialog: (showPasswordDialog) =>
          set((state) => ({ ui: { ...state.ui, showPasswordDialog } })),
        setShow2FADialog: (show2FADialog) =>
          set((state) => ({ ui: { ...state.ui, show2FADialog } })),
        setShowDisconnectDialog: (showDisconnectDialog) =>
          set((state) => ({ ui: { ...state.ui, showDisconnectDialog } })),
        setSelectedAccountId: (selectedAccountId) =>
          set((state) => ({ ui: { ...state.ui, selectedAccountId } })),
        setSelectedSessionId: (selectedSessionId) =>
          set((state) => ({ ui: { ...state.ui, selectedSessionId } })),
        setSelectedApiKeyId: (selectedApiKeyId) =>
          set((state) => ({ ui: { ...state.ui, selectedApiKeyId } })),

        reset: () => set(initialState),
      }),
      {
        name: 'mailsavior-settings',
        partialize: (state) => ({
          preferences: state.preferences,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    ),
    { name: 'SettingsStore' }
  )
);

export const selectPreferences = (state: SettingsState) => state.preferences;
export const selectUI = (state: SettingsState) => state.ui;
