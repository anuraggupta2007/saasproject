import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type {
  UnifiedHistoryFilter,
  SavedFilter,
  ColumnConfig,
  JobType,
  JobStatus,
} from '../types';

interface HistoryState {
  filters: UnifiedHistoryFilter;
  savedFilters: SavedFilter[];
  selectedIds: Set<string>;
  columns: ColumnConfig[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
  searchQuery: string;
  activeTab: 'all' | 'backup' | 'conversion' | 'scheduled';
  ui: {
    sidebarOpen: boolean;
    viewMode: 'table' | 'grid';
    showFilters: boolean;
  };
}

interface HistoryActions {
  setFilters: (filter: UnifiedHistoryFilter) => void;
  updateFilter: (key: keyof UnifiedHistoryFilter, value: unknown) => void;
  clearFilters: () => void;
  resetFilters: () => void;

  setSavedFilters: (filters: SavedFilter[]) => void;
  addSavedFilter: (filter: SavedFilter) => void;
  removeSavedFilter: (id: string) => void;

  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;

  setColumnVisibility: (key: string, visible: boolean) => void;
  setSortBy: (key: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: HistoryState['activeTab']) => void;

  setSidebarOpen: (open: boolean) => void;
  setViewMode: (mode: 'table' | 'grid') => void;
  setShowFilters: (show: boolean) => void;

  reset: () => void;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'jobId', label: 'Job ID', sortable: true, visible: true, width: 'w-24' },
  { key: 'jobType', label: 'Type', sortable: true, visible: true, width: 'w-20' },
  { key: 'name', label: 'Name', sortable: true, visible: true },
  { key: 'accountEmail', label: 'Account', sortable: true, visible: true },
  { key: 'status', label: 'Status', sortable: true, visible: true, width: 'w-28' },
  { key: 'startedAt', label: 'Started', sortable: true, visible: true, width: 'w-28' },
  { key: 'duration', label: 'Duration', sortable: true, visible: true, width: 'w-20' },
  { key: 'totalSize', label: 'Size', sortable: true, visible: true, width: 'w-20' },
  { key: 'emailCount', label: 'Emails', sortable: true, visible: true, width: 'w-20' },
  { key: 'actions', label: '', sortable: false, visible: true, width: 'w-24' },
];

const initialFilters: UnifiedHistoryFilter = {};

const initialState: HistoryState = {
  filters: initialFilters,
  savedFilters: [],
  selectedIds: new Set(),
  columns: DEFAULT_COLUMNS,
  sortBy: 'startedAt',
  sortOrder: 'desc',
  page: 1,
  pageSize: 20,
  searchQuery: '',
  activeTab: 'all',
  ui: {
    sidebarOpen: true,
    viewMode: 'table',
    showFilters: false,
  },
};

export const useHistoryStore = create<HistoryState & HistoryActions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setFilters: (filters) => set({ filters, page: 1 }),
        updateFilter: (key, value) =>
          set((state) => ({
            filters: { ...state.filters, [key]: value },
            page: 1,
          })),
        clearFilters: () => set({ filters: initialFilters, page: 1 }),
        resetFilters: () => set({ filters: initialFilters, page: 1 }),

        setSavedFilters: (savedFilters) => set({ savedFilters }),
        addSavedFilter: (filter) =>
          set((state) => ({ savedFilters: [...state.savedFilters, filter] })),
        removeSavedFilter: (id) =>
          set((state) => ({
            savedFilters: state.savedFilters.filter((f) => f.id !== id),
          })),

        toggleSelection: (id) =>
          set((state) => {
            const selected = new Set(state.selectedIds);
            selected.has(id) ? selected.delete(id) : selected.add(id);
            return { selectedIds: selected };
          }),
        selectAll: (ids) => set({ selectedIds: new Set(ids) }),
        clearSelection: () => set({ selectedIds: new Set() }),

        setColumnVisibility: (key, visible) =>
          set((state) => ({
            columns: state.columns.map((c) =>
              c.key === key ? { ...c, visible } : c
            ),
          })),
        setSortBy: (sortBy) => set({ sortBy }),
        setSortOrder: (sortOrder) => set({ sortOrder }),
        setPage: (page) => set({ page }),
        setPageSize: (pageSize) => set({ pageSize, page: 1 }),
        setSearchQuery: (searchQuery) => set({ searchQuery, page: 1 }),
        setActiveTab: (activeTab) => set({ activeTab, page: 1, selectedIds: new Set() }),

        setSidebarOpen: (sidebarOpen) =>
          set((state) => ({ ui: { ...state.ui, sidebarOpen } })),
        setViewMode: (viewMode) =>
          set((state) => ({ ui: { ...state.ui, viewMode } })),
        setShowFilters: (showFilters) =>
          set((state) => ({ ui: { ...state.ui, showFilters } })),

        reset: () => set(initialState),
      }),
      {
        name: 'mailsavior-history',
        partialize: (state) => ({
          columns: state.columns,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          pageSize: state.pageSize,
          activeTab: state.activeTab,
          ui: { sidebarOpen: state.ui.sidebarOpen, viewMode: state.ui.viewMode },
        }),
      }
    ),
    { name: 'HistoryStore' }
  )
);

export const selectFilters = (state: HistoryState) => state.filters;
export const selectSelectedIds = (state: HistoryState) => state.selectedIds;
export const selectColumns = (state: HistoryState) => state.columns;
export const selectUI = (state: HistoryState) => state.ui;
