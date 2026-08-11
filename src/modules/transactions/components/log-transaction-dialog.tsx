import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { BankAccount } from "#/db/schema";
import type { DialogState } from "#/lib/types";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { useAppForm } from "#/integrations/tanstack-form";
import { useLogTransactionMutation } from "#/modules/transactions/mutations";
import { logTransactionSchema } from "#/modules/transactions/schema";
import { confirm } from "#/stores/use-confirm";

import {
  baseTransactionDefaultValues,
  BaseTransactionFieldGroup,
  baseTransactionFields,
} from "../forms";

type StoreState = DialogState & {
  account: BankAccount | null;
  setAccount: (account: BankAccount) => void;
};

export const useLogTransactionDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  account: null,
  setAccount: (account) => set({ account }),
}));

export function LogTransactionDialog() {
  const { isOpen, closeDialog, toggleDialog, account } = useLogTransactionDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      account: state.account,
    })),
  );

  const mutation = useLogTransactionMutation();

  const defaultValues: z.input<typeof logTransactionSchema> = {
    ...baseTransactionDefaultValues,
    bankAccountId: account?.id ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onBlur: logTransactionSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      closeDialog();
    },
  });

  async function handleOnOpenChange(open: boolean) {
    if (!open && form.state.isDirty) {
      const confirmed = await confirm("Discard new transaction?", {
        description: "The transaction details you entered will be lost.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
      });

      if (!confirmed) return;
    }

    form.reset();

    toggleDialog();
  }

  if (!account) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Transaction</DialogTitle>
        </DialogHeader>
        <div>
          <form
            id={form.formId}
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <BaseTransactionFieldGroup
              form={form}
              currency={account.currency}
              fields={baseTransactionFields}
            />
          </form>
        </div>
        <DialogFooter>
          <form.AppForm>
            <form.Button form={form.formId}>Log Transaction</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
