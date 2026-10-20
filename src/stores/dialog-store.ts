import { create } from "zustand";

type DialogStore<Payload> = {
  isOpen: boolean;
  payload: Payload;
  open: (payload?: Payload) => void;
  close: () => void;
};

const dialogStores: { getState: () => { close: () => void } }[] = [];

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

export function closeAllDialogs() {
  for (const store of dialogStores) store.getState().close();
}
