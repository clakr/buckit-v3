import { create } from "zustand";

type DialogStore<Payload> = {
  isOpen: boolean;
  /** What the dialog was opened with. */
  payload: Payload;
  /**
   * Opens with `payload`, or the dialog's default when none is given, so nothing from an
   * earlier opening carries over.
   */
  open: (payload?: Payload) => void;
  /** Closes, keeping the payload so the dialog can still render while it animates out. */
  close: () => void;
};

/** A dialog's open state and what it was opened with. `defaultPayload` is used when `open()` gets none. */
export function createDialogStore<Payload = undefined>(defaultPayload?: Payload) {
  return create<DialogStore<Payload>>()((set) => ({
    isOpen: false,
    payload: defaultPayload as Payload,
    open: (payload) => set({ isOpen: true, payload: payload ?? (defaultPayload as Payload) }),
    close: () => set({ isOpen: false }),
  }));
}
