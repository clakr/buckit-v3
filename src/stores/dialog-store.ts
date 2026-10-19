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

const dialogStores: { getState: () => { close: () => void } }[] = [];

/** A dialog's open state and what it was opened with. `defaultPayload` is used when `open()` gets none. */
export function createDialogStore<Payload = undefined>(defaultPayload?: Payload) {
  const store = create<DialogStore<Payload>>()((set) => ({
    isOpen: false,
    payload: defaultPayload as Payload,
    open: (payload) => set({ isOpen: true, payload: payload ?? (defaultPayload as Payload) }),
    close: () => set({ isOpen: false }),
  }));

  dialogStores.push(store);

  return store;
}

/** Closes every dialog, e.g. when a Session starts or ends, so none reopens for the next User. */
export function closeAllDialogs() {
  for (const store of dialogStores) store.getState().close();
}
