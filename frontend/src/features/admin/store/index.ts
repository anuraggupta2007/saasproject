import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { SortDirection } from '../types';

interface AdminState {
  ui: {
    sidebarCollapsed: boolean;
    activeTab: string;
  };
  users: {
    search: string;
    role: string;
    status: string;
    plan: string;
    sortField: string;
    sortDirection: SortDirection;
    selectedIds: string[];
    page: number;
  };
  jobs: {
    type: string;
    status: string;
    search: string;
    page: number;
  };
  support: {
    status: string;
    priority: string;
    assignedTo: string;
    page: number;
  };
  audit: {
    action: string;
    userId: string;
    resource: string;
    startDate: string;
    endDate: string;
    page: number;
  };
  payments: {
    status: string;
    provider: string;
    search: string;
    page: number;
  };
}

interface AdminActions {
  toggleSidebar: () => void;
  setActiveTab: (tab: string) => void;
  setUserFilters: (filters: Partial<AdminState['users']>) => void;
  setJobFilters: (filters: Partial<AdminState['jobs']>) => void;
  setSupportFilters: (filters: Partial<AdminState['support']>) => void;
  setAuditFilters: (filters: Partial<AdminState['audit']>) => void;
  setPaymentFilters: (filters: Partial<AdminState['payments']>) => void;
  selectUser: (id: string) => void;
  deselectUser: (id: string) => void;
  selectAllUsers: (ids: string[]) => void;
  clearSelectedUsers: () => void;
  reset: () => void;
}

const initialState: AdminState = {
  ui: { sidebarCollapsed: false, activeTab: 'overview' },
  users: { search: '', role: '', status: '', plan: '', sortField: 'registeredAt', sortDirection: 'desc', selectedIds: [], page: 1 },
  jobs: { type: '', status: '', search: '', page: 1 },
  support: { status: '', priority: '', assignedTo: '', page: 1 },
  audit: { action: '', userId: '', resource: '', startDate: '', endDate: '', page: 1 },
  payments: { status: '', provider: '', search: '', page: 1 },
};

export const useAdminStore = create<AdminState & AdminActions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        toggleSidebar: () =>
          set((s) => ({ ui: { ...s.ui, sidebarCollapsed: !s.ui.sidebarCollapsed } })),
        setActiveTab: (tab) =>
          set((s) => ({ ui: { ...s.ui, activeTab: tab } })),
        setUserFilters: (filters) =>
          set((s) => ({ users: { ...s.users, ...filters } })),
        setJobFilters: (filters) =>
          set((s) => ({ jobs: { ...s.jobs, ...filters } })),
        setSupportFilters: (filters) =>
          set((s) => ({ support: { ...s.support, ...filters } })),
        setAuditFilters: (filters) =>
          set((s) => ({ audit: { ...s.audit, ...filters } })),
        setPaymentFilters: (filters) =>
          set((s) => ({ payments: { ...s.payments, ...filters } })),
        selectUser: (id) =>
          set((s) => ({ users: { ...s.users, selectedIds: [...s.users.selectedIds, id] } })),
        deselectUser: (id) =>
          set((s) => ({ users: { ...s.users, selectedIds: s.users.selectedIds.filter((i) => i !== id) } })),
        selectAllUsers: (ids) =>
          set((s) => ({ users: { ...s.users, selectedIds: ids } })),
        clearSelectedUsers: () =>
          set((s) => ({ users: { ...s.users, selectedIds: [] } })),
        reset: () => set(initialState),
      }),
      { name: 'mailsavior-admin', partialize: (s) => ({ ui: s.ui }) }
    ),
    { name: 'AdminStore' }
  )
);
