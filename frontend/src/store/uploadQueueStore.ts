import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { UploadProgress } from '@/types';

interface UploadQueueState {
  uploads: UploadProgress[];
  maxConcurrent: number;
  isPaused: boolean;
}

interface UploadQueueActions {
  add: (fileId: string, fileName: string, total: number) => void;
  updateProgress: (fileId: string, loaded: number) => void;
  complete: (fileId: string) => void;
  error: (fileId: string, error: string) => void;
  remove: (fileId: string) => void;
  pause: (fileId: string) => void;
  resume: (fileId: string) => void;
  pauseAll: () => void;
  resumeAll: () => void;
  clear: () => void;
  setMaxConcurrent: (max: number) => void;
  getActiveCount: () => number;
}

export const useUploadQueueStore = create<UploadQueueState & UploadQueueActions>()(
  devtools(
    (set, get) => ({
      uploads: [],
      maxConcurrent: 3,
      isPaused: false,

      add: (fileId, fileName, total) =>
        set((s) => ({
          uploads: [
            ...s.uploads.filter((u) => u.fileId !== fileId),
            { fileId, fileName, loaded: 0, total, percentage: 0, status: 'pending' },
          ],
        })),

      updateProgress: (fileId, loaded) =>
        set((s) => ({
          uploads: s.uploads.map((u) =>
            u.fileId === fileId
              ? { ...u, loaded, percentage: Math.round((loaded / u.total) * 100), status: 'uploading' }
              : u
          ),
        })),

      complete: (fileId) =>
        set((s) => ({
          uploads: s.uploads.map((u) =>
            u.fileId === fileId ? { ...u, percentage: 100, status: 'completed' } : u
          ),
        })),

      error: (fileId, error) =>
        set((s) => ({
          uploads: s.uploads.map((u) =>
            u.fileId === fileId ? { ...u, status: 'error', error } : u
          ),
        })),

      remove: (fileId) =>
        set((s) => ({ uploads: s.uploads.filter((u) => u.fileId !== fileId) })),

      pause: (fileId) =>
        set((s) => ({
          uploads: s.uploads.map((u) =>
            u.fileId === fileId && u.status === 'uploading' ? { ...u, status: 'paused' } : u
          ),
        })),

      resume: (fileId) =>
        set((s) => ({
          uploads: s.uploads.map((u) =>
            u.fileId === fileId && u.status === 'paused' ? { ...u, status: 'pending' } : u
          ),
        })),

      pauseAll: () => set({ isPaused: true }),
      resumeAll: () => set({ isPaused: false }),
      clear: () => set({ uploads: [] }),
      setMaxConcurrent: (max) => set({ maxConcurrent: max }),
      getActiveCount: () => get().uploads.filter((u) => u.status === 'uploading').length,
    }),
    { name: 'UploadQueueStore' }
  )
);
