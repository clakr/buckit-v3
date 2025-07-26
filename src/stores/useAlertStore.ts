import { create } from "zustand";

interface AlertState {
	isOpen: boolean;
	title: string;
	description: string;
	actionText: string;
	cancelText?: string;
	onAction?: () => void;
	onCancel?: () => void;
}

interface AlertStore extends AlertState {
	show: (options: Omit<AlertState, "isOpen">) => void;
	hide: () => void;
}

export const USE_ALERT_STORE_DEFAULT_STATE: AlertState = {
	isOpen: false,
	title: "",
	description: "",
	actionText: "Continue",
	cancelText: "Cancel",
	onAction: undefined,
	onCancel: undefined,
};

export const useAlertStore = create<AlertStore>((set) => ({
	...USE_ALERT_STORE_DEFAULT_STATE,
	show: (options) =>
		set({
			isOpen: true,
			title: options.title,
			description: options.description,
			actionText: options.actionText,
			cancelText: options.cancelText || "Cancel",
			onAction: options.onAction,
			onCancel: options.onCancel,
		}),
	hide: () =>
		set({
			...USE_ALERT_STORE_DEFAULT_STATE,
		}),
}));
