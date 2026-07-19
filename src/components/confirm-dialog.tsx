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
  const { isOpen, title, description, confirmLabel, cancelLabel, resolve, reset } =
    useConfirmStore(
      useShallow((state) => ({
        isOpen: state.isOpen,
        title: state.title,
        description: state.description,
        confirmLabel: state.confirmLabel,
        cancelLabel: state.cancelLabel,
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
          resolve?.(false);
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
          <AlertDialogCancel
            onClick={() => {
              resolve?.(false);
              reset();
            }}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
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
