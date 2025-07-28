import { create } from "zustand";

export interface BaseDialogStore {
	isOpen: boolean;
	handleOpen: () => void;
	handleClose: () => void;
	handleToggle: () => void;
}

export function createDialogStore<T extends BaseDialogStore = BaseDialogStore>(
	initializer?: (set: any, get: any) => Omit<T, keyof BaseDialogStore>,
) {
	return create<T>(
		(set, get) =>
			({
				isOpen: false,
				handleOpen: () => set({ isOpen: true } as Partial<T>),
				handleClose: () => set({ isOpen: false } as Partial<T>),
				handleToggle: () => set({ isOpen: !get().isOpen } as Partial<T>),
				...(initializer ? initializer(set, get) : {}),
			}) as T,
	);
}
