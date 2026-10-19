import z from "zod";

import type { BankAccount } from "#/db/schema";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { FieldGroup } from "#/components/ui/field";
import { useAppForm } from "#/integrations/tanstack-form";
import { useLogTransactionMutation } from "#/modules/transactions/mutations";
import { logTransactionSchema, transactionTypeEnum } from "#/modules/transactions/schemas";
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

export const useLogTransactionDialogStore = createDialogStore<{ account: BankAccount | null }>({
  account: null,
});

export function LogTransactionDialog() {
  const { isOpen, payload, close } = useLogTransactionDialogStore();
  const { account } = payload;

  const mutation = useLogTransactionMutation();

  const defaultValues: z.input<typeof logTransactionSchema> = {
    bankAccountId: account?.id ?? "",
    type: "income",
    amount: 0,
    date: new Date(),
    note: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: logTransactionSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      close();
    },
  });

  async function handleOnOpenChange(open: boolean) {
    if (!open && form.state.isDirty) {
      const confirmed = await confirm("Discard new transaction?", {
        description: "The transaction details you entered will be lost.",
        confirmLabel: "Keep Editing",
        cancelLabel: "Discard",
        dismissValue: true,
      });

      if (confirmed) return;
    }

    form.reset();

    close();
  }

  if (!account) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Transaction</DialogTitle>
          <DialogDescription>Record a deposit or withdrawal for this account.</DialogDescription>
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
            <FieldGroup>
              <form.AppField name="type">
                {(field) => (
                  <field.RadioGroup
                    label="Type"
                    options={Object.keys(transactionTypeEnum.enum).map((type) => ({
                      label: type,
                      value: type,
                    }))}
                  />
                )}
              </form.AppField>
              <form.AppField name="amount">
                {(field) => (
                  <field.AmountInput
                    label="Amount"
                    min={0.01}
                    step={0.01}
                    required
                    placeholder="0.00"
                    currency={account.currency}
                  />
                )}
              </form.AppField>
              <form.AppField name="date">
                {(field) => <field.Datepicker label="Date" />}
              </form.AppField>
              <form.AppField name="note">
                {(field) => <field.Textarea label="Note (optional)" placeholder="Add a note..." />}
              </form.AppField>
            </FieldGroup>
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
