import { useQuery } from "@tanstack/react-query";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import type { Debt, Repayment } from "#/db/schema";

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
import { centsToAmountInput } from "#/lib/money";
import { debtQueryOption } from "#/modules/debts/query-options";
import { confirm } from "#/stores/use-confirm";

import { useEditRepaymentMutation } from "../mutations";
import { editRepaymentSchema } from "../schemas";
import { getRepaymentDateRule } from "../utils";

export const editRepaymentDrawerHandle = createDrawerHandle<{
  debtId: Debt["id"];
  repaymentId: Repayment["id"];
}>();

type EditRepaymentFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function EditRepaymentDrawer() {
  const formControlsRef = useRef<EditRepaymentFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard editing repayment?", {
      description: "The repayment details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    editRepaymentDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={editRepaymentDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          {payload ? (
            <EditRepaymentForm
              debtId={payload.debtId}
              repaymentId={payload.repaymentId}
              ref={formControlsRef}
            />
          ) : null}
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}

type EditRepaymentFormProps = {
  debtId: Debt["id"];
  repaymentId: Repayment["id"];
  ref: Ref<EditRepaymentFormControls>;
};

function EditRepaymentForm({ debtId, repaymentId, ref }: EditRepaymentFormProps) {
  const { status, error, refetch, data: debt } = useQuery(debtQueryOption(debtId));

  const repayment = debt?.repayments.find((r) => r.id === repaymentId);

  const mutation = useEditRepaymentMutation();

  const defaultValues: z.input<typeof editRepaymentSchema> = {
    debtId,
    repaymentId,
    amount: centsToAmountInput(repayment?.amount ?? 0),
    date: repayment?.date ?? new Date(),
    note: repayment?.note ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: editRepaymentSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      editRepaymentDrawerHandle.close();
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
        <DrawerTitle>Edit Repayment</DrawerTitle>
        <DrawerDescription>
          {debt && repayment
            ? repayment.bankAccount
              ? `Changes apply to the linked "${repayment.bankAccount.name}" transaction for "${debt.name}".`
              : `Update this off-app repayment against "${debt.name}".`
            : "Update the amount, date, or note for this repayment."}
        </DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {status === "pending" ? (
          <StateTemplate
            state="loading"
            title="Loading repayment"
            description="Fetching repayment details..."
          />
        ) : null}
        {status === "error" && error instanceof NotFoundError ? (
          <StateTemplate
            state="error"
            title="Debt not found"
            description={error.message}
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
          />
        ) : null}
        {status === "error" && !(error instanceof NotFoundError) ? (
          <StateTemplate
            state="error"
            title="Could not load repayment"
            description="We weren't able to retrieve this repayment. Please check your connection and try again."
            content={<Button onClick={() => refetch()}>Retry</Button>}
          />
        ) : null}
        {status === "success" && !repayment ? (
          <StateTemplate
            state="error"
            title="Repayment not found"
            description="This repayment doesn't exist or may have been deleted."
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
          />
        ) : null}
        {status === "success" && repayment ? (
          <form
            id={form.formId}
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField name="amount">
                {(field) => (
                  <field.AmountInput
                    label="Amount"
                    min={0.01}
                    step={0.01}
                    required
                    placeholder="0.00"
                    currency={debt.currency}
                  />
                )}
              </form.AppField>
              <form.AppField
                name="date"
                validators={{
                  onChange: ({ value }) => getRepaymentDateRule(debt.date).validate(value),
                }}
              >
                {(field) => (
                  <field.Datepicker
                    label="Date"
                    disabled={getRepaymentDateRule(debt.date).disabledDays}
                  />
                )}
              </form.AppField>
              <form.AppField name="note">
                {(field) => <field.Textarea label="Note (optional)" placeholder="Add a note..." />}
              </form.AppField>
            </FieldGroup>
          </form>
        ) : null}
      </div>
      {status === "success" && repayment ? (
        <DrawerFooter className="border-t pt-4">
          <form.AppForm>
            <form.Button form={form.formId}>Edit Repayment</form.Button>
          </form.AppForm>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      ) : null}
    </>
  );
}
