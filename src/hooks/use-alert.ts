import { useAlertStore } from "@/components/alert-dialog";

export function useAlert() {
	const show = useAlertStore((state) => state.show);
	const hide = useAlertStore((state) => state.hide);

	return { show, hide };
}
