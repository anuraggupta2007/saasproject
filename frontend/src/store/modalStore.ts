import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface Modal {
  id: string;
  open: boolean;
  data?: unknown;
}

interface ModalState {
  modals: Record<string, Modal>;
}

interface ModalActions {
  open: (id: string, data?: unknown) => void;
  close: (id: string) => void;
  toggle: (id: string) => void;
  isOpen: (id: string) => boolean;
  getData: <T = unknown>(id: string) => T | undefined;
  closeAll: () => void;
}

export const useModalStore = create<ModalState & ModalActions>()(
  devtools(
    (set, get) => ({
      modals: {},

      open: (id, data) =>
        set((s) => ({ modals: { ...s.modals, [id]: { id, open: true, data } } })),

      close: (id) =>
        set((s) => ({ modals: { ...s.modals, [id]: { ...s.modals[id], open: false } } })),

      toggle: (id) =>
        set((s) => ({
          modals: {
            ...s.modals,
            [id]: { id, open: !s.modals[id]?.open, data: s.modals[id]?.data },
          },
        })),

      isOpen: (id) => get().modals[id]?.open ?? false,
      getData: <T = unknown>(id: string) => get().modals[id]?.data as T | undefined,

      closeAll: () => set({ modals: {} }),
    }),
    { name: 'ModalStore' }
  )
);
