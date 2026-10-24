import { useQuery } from "@tanstack/react-query";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import type { Transaction } from "#/db/schema";
import type { getTransaction } from "#/modules/transactions/functions";

import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import {
  createDrawerHandle,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  ResponsiveDrawer,
  type DrawerChangeEventDetails,
} from "#/components/ui/drawer";
import { FieldDescription, FieldGroup } from "#/components/ui/field";
import { useAppForm } from "#/integrations/tanstack-form";
import { NotFoundError } from "#/lib/errors";
import { centsToAmountInput } from "#/lib/money";
import { getRepaymentDateRule } from "#/modules/repayments/utils";
import { useEditTransactionMutation } from "#/modules/transactions/mutations";
import { transactionQueryOption } from "#/modules/transactions/query-options";
import { editTransactionSchema, transactionTypeEnum } from "#/modules/transactions/schemas";
import { confirm } from "#/stores/use-confirm";

export const editTransactionDrawerHandle = createDrawerHandle<{
  transactionId: Transaction["id"];
}>();

type EditTransactionFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

function describeTransactionLink(
  link: NonNullable<Awaited<ReturnType<typeof getTransaction>>["link"]>,
) {
  switch (link.kind) {
    case "repayment":
      return `This is a repayment on ${link.debt.name}'s debt, so its type is fixed and it can't be dated before the debt.`;
    case "origination":
      return `This funded ${link.debt.name}'s debt, so its type and amount are fixed. To correct the amount, delete the debt and record it again.`;
    case "withdrawal":
      return `This is a withdrawal from ${link.bucket.name}, so its type is fixed and its amount can't exceed what the bucket holds from this account.`;
  }
}

export function EditTransactionDrawer() {
  const formControlsRef = useRef<EditTransactionFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard editing transaction?", {
      description: "The transaction details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    editTransactionDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={editTransactionDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          {payload ? (
            <EditTransactionForm transactionId={payload.transactionId} ref={formControlsRef} />
          ) : null}
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}

type EditTransactionFormProps = {
  transactionId: Transaction["id"];
  ref: Ref<EditTransactionFormControls>;
};

function EditTransactionForm({ transactionId, ref }: EditTransactionFormProps) {
  const {
    status,
    error,
    refetch,
    data: transaction,
  } = useQuery(transactionQueryOption(transactionId));

  const mutation = useEditTransactionMutation();

  const defaultValues: z.input<typeof editTransactionSchema> = {
    transactionId,
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
      editTransactionDrawerHandle.close();
    },
  });

  useImperativeHandle(
    ref,
    () => ({ isDirty: () => form.state.isDirty, reset: () => form.reset() }),
    [form],
  );

  const repaymentDateRule =
    transaction?.link?.kind === "repayment"
      ? getRepaymentDateRule(transaction.link.debt.date)
      : undefined;

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Edit Transaction</DrawerTitle>
        <DrawerDescription>Update the details of this transaction.</DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
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
                <FieldDescription>{describeTransactionLink(transaction.link)}</FieldDescription>
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
                {(field) => <field.Textarea label="Note (optional)" placeholder="Add a note..." />}
              </form.AppField>
            </FieldGroup>
          </form>
        ) : null}
      </div>
      {status === "success" ? (
        <DrawerFooter className="border-t pt-4">
          <form.AppForm>
            <form.Button form={form.formId}>Edit Transaction</form.Button>
          </form.AppForm>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      ) : null}
    </>
  );
}
