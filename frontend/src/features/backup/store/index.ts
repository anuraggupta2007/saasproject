import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type {
  BackupJob,
  ConnectedAccount,
  BackupSchedule,
  JobStatus,
  JobStage,
  Provider,
  WizardData,
  WizardStep,
} from '../types';

interface BackupState {
  accounts: ConnectedAccount[];
  activeAccount: ConnectedAccount | null;
  jobs: BackupJob[];
  activeJob: BackupJob | null;
  schedules: BackupSchedule[];
  providers: Provider[];
  wizard: {
    currentStep: number;
    data: WizardData;
    completedSteps: Set<string>;
    isSubmitting: boolean;
    error?: string;
  };
  filters: {
    jobs: { status?: JobStatus[]; accountId?: string; search?: string };
    history: { status?: JobStatus[]; accountId?: string; dateFrom?: string; dateTo?: string };
  };
  ui: {
    sidebarOpen: boolean;
    viewMode: 'grid' | 'list';
    selectedJobIds: Set<string>;
    selectedAccountIds: Set<string>;
  };
  liveProgress: {
    jobId: string | null;
    progress: BackupJob['progress'] | null;
    logs: string[];
    connected: boolean;
  };
}

interface BackupActions {
  setAccounts: (accounts: ConnectedAccount[]) => void;
  addAccount: (account: ConnectedAccount) => void;
  updateAccount: (id: string, updates: Partial<ConnectedAccount>) => void;
  removeAccount: (id: string) => void;
  setActiveAccount: (account: ConnectedAccount | null) => void;

  setJobs: (jobs: BackupJob[]) => void;
  addJob: (job: BackupJob) => void;
  updateJob: (id: string, updates: Partial<BackupJob>) => void;
  removeJob: (id: string) => void;
  setActiveJob: (job: BackupJob | null) => void;

  setSchedules: (schedules: BackupSchedule[]) => void;
  addSchedule: (schedule: BackupSchedule) => void;
  updateSchedule: (id: string, updates: Partial<BackupSchedule>) => void;
  removeSchedule: (id: string) => void;

  setProviders: (providers: Provider[]) => void;

  setWizardStep: (step: number) => void;
  setWizardData: (data: Partial<WizardData>) => void;
  completeWizardStep: (stepId: string) => void;
  resetWizard: () => void;
  setWizardSubmitting: (submitting: boolean) => void;
  setWizardError: (error?: string) => void;

  setJobFilters: (filters: BackupState['filters']['jobs']) => void;
  setHistoryFilters: (filters: BackupState['filters']['history']) => void;

  setSidebarOpen: (open: boolean) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  toggleJobSelection: (id: string) => void;
  toggleAccountSelection: (id: string) => void;
  clearSelections: () => void;

  setLiveProgress: (jobId: string | null, progress?: BackupJob['progress']) => void;
  addLiveLog: (log: string) => void;
  clearLiveLogs: () => void;
  setLiveConnected: (connected: boolean) => void;

  reset: () => void;
}

const initialWizardState = {
  currentStep: 0,
  data: {} as WizardData,
  completedSteps: new Set<string>(),
  isSubmitting: false,
  error: undefined as string | undefined,
};

const initialState: BackupState = {
  accounts: [],
  activeAccount: null,
  jobs: [],
  activeJob: null,
  schedules: [],
  providers: [],
  wizard: initialWizardState,
  filters: {
    jobs: {},
    history: {},
  },
  ui: {
    sidebarOpen: true,
    viewMode: 'grid',
    selectedJobIds: new Set(),
    selectedAccountIds: new Set(),
  },
  liveProgress: {
    jobId: null,
    progress: null,
    logs: [],
    connected: false,
  },
};

export const useBackupStore = create<BackupState & BackupActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setAccounts: (accounts) => set({ accounts }),
        addAccount: (account) => set((state) => ({ accounts: [...state.accounts, account] })),
        updateAccount: (id, updates) =>
          set((state) => ({
            accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
            activeAccount: state.activeAccount?.id === id ? { ...state.activeAccount, ...updates } : state.activeAccount,
          })),
        removeAccount: (id) =>
          set((state) => ({
            accounts: state.accounts.filter((a) => a.id !== id),
            activeAccount: state.activeAccount?.id === id ? null : state.activeAccount,
          })),
        setActiveAccount: (account) => set({ activeAccount: account }),

        setJobs: (jobs) => set({ jobs }),
        addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
        updateJob: (id, updates) =>
          set((state) => ({
            jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
            activeJob: state.activeJob?.id === id ? { ...state.activeJob, ...updates } : state.activeJob,
          })),
        removeJob: (id) =>
          set((state) => ({
            jobs: state.jobs.filter((j) => j.id !== id),
            activeJob: state.activeJob?.id === id ? null : state.activeJob,
          })),
        setActiveJob: (job) => set({ activeJob: job }),

        setSchedules: (schedules) => set({ schedules }),
        addSchedule: (schedule) => set((state) => ({ schedules: [...state.schedules, schedule] })),
        updateSchedule: (id, updates) =>
          set((state) => ({
            schedules: state.schedules.map((s) => (s.id === id ? { ...s, ...updates } : s)),
          })),
        removeSchedule: (id) =>
          set((state) => ({ schedules: state.schedules.filter((s) => s.id !== id) })),

        setProviders: (providers) => set({ providers }),

        setWizardStep: (currentStep) => set((state) => ({ wizard: { ...state.wizard, currentStep } })),
        setWizardData: (data) => set((state) => ({ wizard: { ...state.wizard, data: { ...state.wizard.data, ...data } } })),
        completeWizardStep: (stepId) =>
          set((state) => ({ wizard: { ...state.wizard, completedSteps: new Set(state.wizard.completedSteps).add(stepId) } })),
        resetWizard: () => set({ wizard: initialWizardState }),
        setWizardSubmitting: (isSubmitting) => set((state) => ({ wizard: { ...state.wizard, isSubmitting } })),
        setWizardError: (error) => set((state) => ({ wizard: { ...state.wizard, error } })),

        setJobFilters: (filters) => set((state) => ({ filters: { ...state.filters, jobs: filters } })),
        setHistoryFilters: (filters) => set((state) => ({ filters: { ...state.filters, history: filters } })),

        setSidebarOpen: (sidebarOpen) => set((state) => ({ ui: { ...state.ui, sidebarOpen } })),
        setViewMode: (viewMode) => set((state) => ({ ui: { ...state.ui, viewMode } })),
        toggleJobSelection: (id) =>
          set((state) => {
            const selected = new Set(state.ui.selectedJobIds);
            selected.has(id) ? selected.delete(id) : selected.add(id);
            return { ui: { ...state.ui, selectedJobIds: selected } };
          }),
        toggleAccountSelection: (id) =>
          set((state) => {
            const selected = new Set(state.ui.selectedAccountIds);
            selected.has(id) ? selected.delete(id) : selected.add(id);
            return { ui: { ...state.ui, selectedAccountIds: selected } };
          }),
        clearSelections: () => set((state) => ({ ui: { ...state.ui, selectedJobIds: new Set(), selectedAccountIds: new Set() } })),

        setLiveProgress: (jobId, progress) =>
          set((state) => ({ liveProgress: { ...state.liveProgress, jobId, progress: progress ?? state.liveProgress.progress } })),
        addLiveLog: (log) =>
          set((state) => ({ liveProgress: { ...state.liveProgress, logs: [...state.liveProgress.logs, log] } })),
        clearLiveLogs: () => set((state) => ({ liveProgress: { ...state.liveProgress, logs: [] } })),
        setLiveConnected: (connected) => set((state) => ({ liveProgress: { ...state.liveProgress, connected } })),

        reset: () => set(initialState),
      }),
      {
        name: 'mailsavior-backup',
        partialize: (state) => ({
          ui: { sidebarOpen: state.ui.sidebarOpen, viewMode: state.ui.viewMode },
          filters: state.filters,
        }),
      }
    ),
    { name: 'BackupStore' }
  )
);

export const selectAccounts = (state: BackupState) => state.accounts;
export const selectActiveAccount = (state: BackupState) => state.activeAccount;
export const selectJobs = (state: BackupState) => state.jobs;
export const selectActiveJob = (state: BackupState) => state.activeJob;
export const selectSchedules = (state: BackupState) => state.schedules;
export const selectProviders = (state: BackupState) => state.providers;
export const selectWizard = (state: BackupState) => state.wizard;
export const selectFilters = (state: BackupState) => state.filters;
export const selectUI = (state: BackupState) => state.ui;
export const selectLiveProgress = (state: BackupState) => state.liveProgress;