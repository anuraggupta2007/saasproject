import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type {
  ConversionJob,
  InputFileInfo,
  ConversionWizardData,
  ConversionFilter,
  ConversionStage,
  ConversionProgress,
  DEFAULT_WIZARD_DATA,
} from '../types';

interface ConverterState {
  uploadedFiles: InputFileInfo[];
  wizard: {
    currentStep: number;
    data: ConversionWizardData;
    completedSteps: Set<string>;
    isSubmitting: boolean;
    error?: string;
  };
  filters: ConversionFilter;
  ui: {
    sidebarOpen: boolean;
    viewMode: 'grid' | 'list';
    selectedJobIds: Set<string>;
    selectedFileIds: Set<string>;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  liveProgress: {
    jobId: string | null;
    progress: ConversionProgress | null;
    stage: ConversionStage | null;
    logs: string[];
    connected: boolean;
  };
}

interface ConverterActions {
  setUploadedFiles: (files: InputFileInfo[]) => void;
  addUploadedFile: (file: InputFileInfo) => void;
  updateUploadedFile: (id: string, updates: Partial<InputFileInfo>) => void;
  removeUploadedFile: (id: string) => void;
  clearUploadedFiles: () => void;

  setWizardStep: (step: number) => void;
  setWizardData: (data: Partial<ConversionWizardData>) => void;
  completeWizardStep: (stepId: string) => void;
  resetWizard: () => void;
  setWizardSubmitting: (submitting: boolean) => void;
  setWizardError: (error?: string) => void;

  setFilters: (filters: ConversionFilter) => void;
  resetFilters: () => void;

  setSidebarOpen: (open: boolean) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  toggleJobSelection: (id: string) => void;
  toggleFileSelection: (id: string) => void;
  clearSelections: () => void;
  setSortBy: (key: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  setLiveProgress: (jobId: string | null, progress?: ConversionProgress) => void;
  setLiveStage: (stage: ConversionStage) => void;
  addLiveLog: (log: string) => void;
  clearLiveLogs: () => void;
  setLiveConnected: (connected: boolean) => void;

  reset: () => void;
}

const initialWizardState = {
  currentStep: 0,
  data: {
    files: [],
    outputFormats: [],
    options: {
      preserveFolderStructure: true,
      preserveMetadata: true,
      preserveAttachments: true,
      includeHeaders: true,
      includeDeletedItems: false,
      mergeOutputFiles: false,
      splitLargeFiles: false,
      splitSizeMb: 100,
      namingConvention: 'original' as const,
    },
    filters: {
      readStatus: 'all' as const,
      starred: false,
    },
    destination: {
      location: 'local' as const,
      path: '/converted',
    },
  },
  completedSteps: new Set<string>(),
  isSubmitting: false,
  error: undefined as string | undefined,
};

const initialState: ConverterState = {
  uploadedFiles: [],
  wizard: initialWizardState,
  filters: {},
  ui: {
    sidebarOpen: true,
    viewMode: 'grid',
    selectedJobIds: new Set(),
    selectedFileIds: new Set(),
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  liveProgress: {
    jobId: null,
    progress: null,
    stage: null,
    logs: [],
    connected: false,
  },
};

export const useConverterStore = create<ConverterState & ConverterActions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setUploadedFiles: (files) => set({ uploadedFiles: files }),
        addUploadedFile: (file) =>
          set((state) => ({ uploadedFiles: [...state.uploadedFiles, file] })),
        updateUploadedFile: (id, updates) =>
          set((state) => ({
            uploadedFiles: state.uploadedFiles.map((f) =>
              f.id === id ? { ...f, ...updates } : f
            ),
          })),
        removeUploadedFile: (id) =>
          set((state) => ({
            uploadedFiles: state.uploadedFiles.filter((f) => f.id !== id),
          })),
        clearUploadedFiles: () => set({ uploadedFiles: [] }),

        setWizardStep: (currentStep) =>
          set((state) => ({ wizard: { ...state.wizard, currentStep } })),
        setWizardData: (data) =>
          set((state) => ({
            wizard: { ...state.wizard, data: { ...state.wizard.data, ...data } },
          })),
        completeWizardStep: (stepId) =>
          set((state) => ({
            wizard: {
              ...state.wizard,
              completedSteps: new Set(state.wizard.completedSteps).add(stepId),
            },
          })),
        resetWizard: () => set({ wizard: initialWizardState }),
        setWizardSubmitting: (isSubmitting) =>
          set((state) => ({ wizard: { ...state.wizard, isSubmitting } })),
        setWizardError: (error) =>
          set((state) => ({ wizard: { ...state.wizard, error } })),

        setFilters: (filters) => set({ filters }),
        resetFilters: () => set({ filters: {} }),

        setSidebarOpen: (sidebarOpen) =>
          set((state) => ({ ui: { ...state.ui, sidebarOpen } })),
        setViewMode: (viewMode) =>
          set((state) => ({ ui: { ...state.ui, viewMode } })),
        toggleJobSelection: (id) =>
          set((state) => {
            const selected = new Set(state.ui.selectedJobIds);
            selected.has(id) ? selected.delete(id) : selected.add(id);
            return { ui: { ...state.ui, selectedJobIds: selected } };
          }),
        toggleFileSelection: (id) =>
          set((state) => {
            const selected = new Set(state.ui.selectedFileIds);
            selected.has(id) ? selected.delete(id) : selected.add(id);
            return { ui: { ...state.ui, selectedFileIds: selected } };
          }),
        clearSelections: () =>
          set((state) => ({
            ui: { ...state.ui, selectedJobIds: new Set(), selectedFileIds: new Set() },
          })),
        setSortBy: (sortBy) =>
          set((state) => ({ ui: { ...state.ui, sortBy } })),
        setSortOrder: (sortOrder) =>
          set((state) => ({ ui: { ...state.ui, sortOrder } })),

        setLiveProgress: (jobId, progress) =>
          set((state) => ({
            liveProgress: {
              ...state.liveProgress,
              jobId,
              progress: progress ?? state.liveProgress.progress,
            },
          })),
        setLiveStage: (stage) =>
          set((state) => ({ liveProgress: { ...state.liveProgress, stage } })),
        addLiveLog: (log) =>
          set((state) => ({
            liveProgress: { ...state.liveProgress, logs: [...state.liveProgress.logs, log] },
          })),
        clearLiveLogs: () =>
          set((state) => ({ liveProgress: { ...state.liveProgress, logs: [] } })),
        setLiveConnected: (connected) =>
          set((state) => ({ liveProgress: { ...state.liveProgress, connected } })),

        reset: () => set(initialState),
      }),
      {
        name: 'mailsavior-converter',
        partialize: (state) => ({
          ui: {
            sidebarOpen: state.ui.sidebarOpen,
            viewMode: state.ui.viewMode,
            sortBy: state.ui.sortBy,
            sortOrder: state.ui.sortOrder,
          },
          filters: state.filters,
        }),
      }
    ),
    { name: 'ConverterStore' }
  )
);

export const selectUploadedFiles = (state: ConverterState) => state.uploadedFiles;
export const selectWizard = (state: ConverterState) => state.wizard;
export const selectFilters = (state: ConverterState) => state.filters;
export const selectUI = (state: ConverterState) => state.ui;
export const selectLiveProgress = (state: ConverterState) => state.liveProgress;
