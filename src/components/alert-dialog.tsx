import {
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialog as UIAlertDialog,
} from "@/components/ui/alert-dialog";
import { useAlertStore } from "@/stores/useAlertStore";

export function AlertDialog() {
	const {
		isOpen,
		title,
		description,
		actionText,
		cancelText,
		onAction,
		onCancel,
		hide,
	} = useAlertStore();

	function handleAction() {
		onAction?.();
		hide();
	}

	function handleCancel() {
		onCancel?.();
		hide();
	}

	return (
		<UIAlertDialog open={isOpen} onOpenChange={(open) => !open && hide()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={handleCancel}>
						{cancelText}
					</AlertDialogCancel>
					<AlertDialogAction onClick={handleAction}>
						{actionText}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</UIAlertDialog>
	);
}
