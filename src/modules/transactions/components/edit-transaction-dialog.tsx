import { useQuery } from "@tanstack/react-query";
import z from "zod";

import type { Transaction } from "#/db/schema";

import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { FieldDescription, FieldGroup } from "#/components/ui/field";
import { useAppForm } from "#/integrations/tanstack-form";
import { NotFoundError } from "#/lib/errors";
import { centsToAmountInput } from "#/lib/money";
import { getRepaymentDateRule } from "#/modules/repayments/utils";
import { useEditTransactionMutation } from "#/modules/transactions/mutations";
import { transactionQueryOption } from "#/modules/transactions/query-options";
import { editTransactionSchema, transactionTypeEnum } from "#/modules/transactions/schemas";
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

export const useEditTransactionDialogStore = createDialogStore<{
  transactionId: Transaction["id"] | null;
}>({ transactionId: null });

export function EditTransactionDialog() {
  const { isOpen, payload, close } = useEditTransactionDialogStore();
  const { transactionId } = payload;

  const {
    status,
    error,
    refetch,
    data: transaction,
  } = useQuery({
    ...transactionQueryOption(transactionId ?? ""),
    enabled: isOpen,
  });

  const mutation = useEditTransactionMutation();

  const defaultValues: z.input<typeof editTransactionSchema> = {
    transactionId: transaction?.id ?? "",
    type: transaction?.type ?? "income",
    amount: centsToAmountInput(transaction?.amount ?? 0),
    date: transaction?.date ?? new Date(),
    note: transaction?.note ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: editTransactionSchema,
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

  const repaymentDateRule =
    transaction?.link?.kind === "repayment"
      ? getRepaymentDateRule(transaction.link.debtDate)
      : undefined;

  async function handleOnOpenChange(open: boolean) {
    if (!open && form.state.isDirty) {
      const confirmed = await confirm("Discard editing transaction?", {
        description: "The transaction details you entered will be lost.",
        confirmLabel: "Keep Editing",
        cancelLabel: "Discard",
      });

      if (confirmed) return;
    }

    form.reset();

    close();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>Update the details of this transaction.</DialogDescription>
        </DialogHeader>
        <div>
          {status === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading transaction"
              description="Fetching transaction details..."
            />
          ) : null}
          {status === "error" && error instanceof NotFoundError ? (
            <StateTemplate
              state="error"
              title="Transaction not found"
              description={error.message}
              content={
                <Button variant="secondary" onClick={close}>
                  Close
                </Button>
              }
            />
          ) : null}
          {status === "error" && !(error instanceof NotFoundError) ? (
            <StateTemplate
              state="error"
              title="Could not load transaction"
              description="We weren't able to retrieve this transaction. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {status === "success" ? (
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
                      disabled={transaction.locks.type}
                    />
                  )}
                </form.AppField>
                {transaction.link ? (
                  <FieldDescription>
                    {transaction.link.kind === "repayment"
                      ? `This is a repayment on ${transaction.link.debtName}'s debt, so its type is fixed and it can't be dated before the debt.`
                      : `This funded ${transaction.link.debtName}'s debt, so its type and amount are fixed. To correct the amount, delete the debt and record it again.`}
                  </FieldDescription>
                ) : null}
                <form.AppField name="amount">
                  {(field) => (
                    <field.AmountInput
                      label="Amount"
                      min={0.01}
                      step={0.01}
                      required
                      placeholder="0.00"
                      currency={transaction.bankAccount?.currency}
                      locked={transaction.locks.amount}
                    />
                  )}
                </form.AppField>
                <form.AppField
                  name="date"
                  validators={{
                    onChange: ({ value }) => repaymentDateRule?.validate(value),
                  }}
                >
                  {(field) => (
                    <field.Datepicker label="Date" disabled={repaymentDateRule?.disabledDays} />
                  )}
                </form.AppField>
                <form.AppField name="note">
                  {(field) => (
                    <field.Textarea label="Note (optional)" placeholder="Add a note..." />
                  )}
                </form.AppField>
              </FieldGroup>
            </form>
          ) : null}
        </div>
        {status === "success" ? (
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId}>Edit Transaction</form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
