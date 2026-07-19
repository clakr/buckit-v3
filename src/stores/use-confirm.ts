import { create } from "zustand";

interface ConfirmOptions {
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmState {
  isOpen: boolean;
  title: string | null;
  description: string | null;
  confirmLabel: string;
  cancelLabel: string;
  resolve: ((value: boolean) => void) | null;
  confirm: (title: string, options?: ConfirmOptions) => Promise<boolean>;
  reset: () => void;
}

export const useConfirmStore = create<ConfirmState>()((set, get) => ({
  isOpen: false,
  title: null,
  description: null,
  confirmLabel: "Continue",
  cancelLabel: "Cancel",
  resolve: null,

  confirm: (title, options) => {
    return new Promise<boolean>((resolve) => {
      const state = get();
      state.resolve?.(false);

      set({
        isOpen: true,
        title,
        description: options?.description ?? null,
        confirmLabel: options?.confirmLabel ?? "Continue",
        cancelLabel: options?.cancelLabel ?? "Cancel",
        resolve,
      });
    });
  },

  reset: () =>
    set({
      isOpen: false,
      title: null,
      description: null,
      resolve: null,
    }),
}));

export function confirm(title: string, options?: ConfirmOptions) {
  return useConfirmStore.getState().confirm(title, options);
}
