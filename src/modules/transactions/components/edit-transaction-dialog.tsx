import { IconAlertCircle, IconFileDescription } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { Transaction } from "#/db/schema";
import type { DialogState } from "#/lib/types";

import { StateTemplate } from "#/components/state-template";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { useAppForm } from "#/integrations/tanstack-form";
import { currencyCodec } from "#/lib/codecs";
import {
  baseTransactionDefaultValues,
  BaseTransactionFieldGroup,
  baseTransactionFields,
} from "#/modules/transactions/forms";
import { validateEditTransaction } from "#/modules/transactions/functions";
import { useEditTransactionMutation } from "#/modules/transactions/mutations";
import { transactionQueryOption } from "#/modules/transactions/query-options";
import { editTransactionSchema } from "#/modules/transactions/schema";
import { confirm } from "#/stores/use-confirm";

type StoreState = DialogState & {
  transactionId: Transaction["id"] | null;
  setTransactionId: (transactionId: Transaction["id"]) => void;
};

export const useEditTransactionDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  transactionId: null,
  setTransactionId: (transactionId) => set({ transactionId }),
}));

export function EditTransactionDialog() {
  const { isOpen, closeDialog, toggleDialog, transactionId } = useEditTransactionDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      transactionId: state.transactionId,
    })),
  );

  const {
    isLoading,
    isError,
    refetch,
    data: transaction,
  } = useQuery({
    ...transactionQueryOption(transactionId ?? ""),
    enabled: isOpen,
  });

  const mutation = useEditTransactionMutation();

  const defaultValues: z.input<typeof editTransactionSchema> = {
    transactionId: transactionId ?? "",
    type: transaction?.type ?? baseTransactionDefaultValues.type,
    amount: currencyCodec.encode(transaction?.amount ?? 0),
    date: transaction?.date ?? baseTransactionDefaultValues.date,
    note: transaction?.note ?? baseTransactionDefaultValues.note,
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onBlur: editTransactionSchema,
      onSubmitAsync: async ({ value }) => {
        const { isValid, message } = await validateEditTransaction({
          data: {
            bankAccountId: transaction?.bankAccountId ?? "",
            transactionId: transaction?.id ?? "",
            type: value.type,
            amount: currencyCodec.decode(Number(value.amount)),
          },
        });

        if (!isValid) return message;

        return undefined;
      },
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
        confirmLabel: "Keep Editing",
        cancelLabel: "Discard",
      });

      if (confirmed) return;
    }

    form.reset();

    toggleDialog();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <div>
          {isLoading ? (
            <StateTemplate
              state="loading"
              title="Loading transaction"
              description="Fetching transaction details..."
            />
          ) : null}
          {isError ? (
            <StateTemplate
              state="error"
              title="Could not load transaction"
              description="We weren't able to retrieve this bucket. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {transaction ? (
            <form
              id={form.formId}
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
              className="flex flex-col gap-y-4"
            >
              <BaseTransactionFieldGroup
                form={form}
                fields={baseTransactionFields}
                currency={transaction.bankAccount?.currency ?? "PHP"}
              />
              <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
                {(error) =>
                  error ? (
                    <Alert variant="destructive" className="max-w-md">
                      <IconAlertCircle />
                      <AlertTitle>Edit Transaction failed</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null
                }
              </form.Subscribe>
            </form>
          ) : (
            <StateTemplate
              state="empty"
              title="Transaction not found"
              description="This transaction doesn't exist or may have been deleted."
              icon={<IconFileDescription />}
            />
          )}
        </div>
        <DialogFooter>
          <form.AppForm>
            <form.Button form={form.formId}>Edit Transaction</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
