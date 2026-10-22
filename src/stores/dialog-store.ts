import { create, type StoreApi, type UseBoundStore } from "zustand";

type DialogStore<Payload> = {
  isOpen: boolean;
  payload: Payload;
  open: (payload?: Payload) => void;
  close: () => void;
};

type DialogStoreHook<Payload> = UseBoundStore<StoreApi<DialogStore<Payload>>>;

const dialogStores: { getState: () => { close: () => void } }[] = [];

export function createDialogStore(): DialogStoreHook<undefined>;
export function createDialogStore<Payload>(defaultPayload: Payload): DialogStoreHook<Payload>;
export function createDialogStore<Payload>(defaultPayload?: Payload) {
  const store = create<DialogStore<Payload | undefined>>()((set) => ({
    isOpen: false,
    payload: defaultPayload,
    open: (payload) => set({ isOpen: true, payload: payload ?? defaultPayload }),
    close: () => set({ isOpen: false }),
  }));

  dialogStores.push(store);

  return store;
}

export function closeAllDialogs() {
  for (const store of dialogStores) store.getState().close();
}
