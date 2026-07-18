import { create } from "zustand";

type DialogState = {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  toggleDialog: () => void;
};

const createBaseDialogState = (set: any) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state: any) => ({ isOpen: !state.isOpen })),
});

export function createDialogStore<Ext extends Record<string, unknown>>(
  extend?: (
    set: Parameters<typeof createBaseDialogState>[0],
    get: () => DialogState & Ext,
  ) => Ext,
) {
  return create<DialogState & Ext>()((set, get) => ({
    ...(createBaseDialogState(set) as DialogState),
    ...extend?.(set, get),
  }));
}
