import { useQuery } from "@tanstack/react-query";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import type { Withdrawal } from "#/db/schema";

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
import { FieldGroup } from "#/components/ui/field";
import { useAppForm } from "#/integrations/tanstack-form";
import { NotFoundError } from "#/lib/errors";
import {
  centsToAmountInput,
  describeInsufficientHeld,
  exceedsAvailable,
  formatMoney,
} from "#/lib/money";
import { useEditWithdrawalMutation } from "#/modules/withdrawals/mutations";
import { withdrawalQueryOption } from "#/modules/withdrawals/query-options";
import { editWithdrawalSchema } from "#/modules/withdrawals/schemas";
import { confirm } from "#/stores/use-confirm";

export const editWithdrawalDrawerHandle = createDrawerHandle<{
  withdrawalId: Withdrawal["id"];
}>();

type EditWithdrawalFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function EditWithdrawalDrawer() {
  const formControlsRef = useRef<EditWithdrawalFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard editing withdrawal?", {
      description: "The withdrawal details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    editWithdrawalDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={editWithdrawalDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          {payload ? (
            <EditWithdrawalForm withdrawalId={payload.withdrawalId} ref={formControlsRef} />
          ) : null}
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}

type EditWithdrawalFormProps = {
  withdrawalId: Withdrawal["id"];
  ref: Ref<EditWithdrawalFormControls>;
};

function EditWithdrawalForm({ withdrawalId, ref }: EditWithdrawalFormProps) {
  const {
    status,
    error,
    refetch,
    data: withdrawal,
  } = useQuery(withdrawalQueryOption(withdrawalId));

  const mutation = useEditWithdrawalMutation();

  const defaultValues: z.input<typeof editWithdrawalSchema> = {
    withdrawalId,
    amount: centsToAmountInput(withdrawal?.amount ?? 0),
    date: withdrawal?.date ?? new Date(),
    note: withdrawal?.note ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: editWithdrawalSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      editWithdrawalDrawerHandle.close();
    },
  });

  useImperativeHandle(
    ref,
    () => ({ isDirty: () => form.state.isDirty, reset: () => form.reset() }),
    [form],
  );

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Edit Withdrawal</DrawerTitle>
        <DrawerDescription>
          {withdrawal
            ? `Update the amount, date, or note for this withdrawal from ${withdrawal.bucket.name}. To change its bucket or account, delete it and withdraw again.`
            : "Update the amount, date, or note for this withdrawal."}
        </DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {status === "pending" ? (
          <StateTemplate
            state="loading"
            title="Loading withdrawal"
            description="Fetching withdrawal details..."
          />
        ) : null}
        {status === "error" && error instanceof NotFoundError ? (
          <StateTemplate
            state="error"
            title="Withdrawal not found"
            description={error.message}
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
          />
        ) : null}
        {status === "error" && !(error instanceof NotFoundError) ? (
          <StateTemplate
            state="error"
            title="Could not load withdrawal"
            description="We weren't able to retrieve this withdrawal. Please check your connection and try again."
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
              <form.AppField
                name="amount"
                validators={{
                  onChange: ({ value }) =>
                    exceedsAvailable(value, withdrawal.available)
                      ? {
                          message: describeInsufficientHeld({
                            bucket: withdrawal.bucket,
                            bankAccount: withdrawal.bankAccount,
                            availableCents: withdrawal.available,
                          }),
                        }
                      : undefined,
                }}
              >
                {(field) => (
                  <field.AmountInput
                    label="Amount"
                    min={0.01}
                    step={0.01}
                    required
                    placeholder="0.00"
                    currency={withdrawal.bankAccount.currency}
                    description={
                      <>
                        Available:{" "}
                        <span className="font-semibold">
                          {formatMoney(withdrawal.available, withdrawal.bankAccount.currency)}
                        </span>
                      </>
                    }
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
        ) : null}
      </div>
      {status === "success" ? (
        <DrawerFooter className="border-t pt-4">
          <form.AppForm>
            <form.Button form={form.formId}>Edit Withdrawal</form.Button>
          </form.AppForm>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      ) : null}
    </>
  );
}
