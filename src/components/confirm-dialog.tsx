import { useShallow } from "zustand/react/shallow";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { useConfirmStore } from "#/stores/use-confirm";

export function ConfirmDialog() {
  const {
    isOpen,
    title,
    description,
    confirmLabel,
    cancelLabel,
    dismissValue,
    destructive,
    resolve,
    reset,
  } = useConfirmStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      title: state.title,
      description: state.description,
      confirmLabel: state.confirmLabel,
      cancelLabel: state.cancelLabel,
      dismissValue: state.dismissValue,
      destructive: state.destructive,
      resolve: state.resolve,
      reset: state.reset,
    })),
  );

  if (!isOpen) return null;

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resolve?.(dismissValue);
          reset();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {cancelLabel ? (
            <AlertDialogCancel
              onClick={() => {
                resolve?.(false);
                reset();
              }}
            >
              {cancelLabel}
            </AlertDialogCancel>
          ) : null}
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            onClick={() => {
              resolve?.(true);
              reset();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
