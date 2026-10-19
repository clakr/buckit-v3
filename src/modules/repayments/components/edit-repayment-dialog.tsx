import { useQuery } from "@tanstack/react-query";
import z from "zod";

import type { Debt, Repayment } from "#/db/schema";

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
import { FieldGroup } from "#/components/ui/field";
import { useAppForm } from "#/integrations/tanstack-form";
import { NotFoundError } from "#/lib/errors";
import { centsToAmountInput } from "#/lib/money";
import { debtQueryOption } from "#/modules/debts/query-options";
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

import { useEditRepaymentMutation } from "../mutations";
import { editRepaymentSchema } from "../schemas";
import { getRepaymentDateRule } from "../utils";

export const useEditRepaymentDialogStore = createDialogStore<{
  debtId: Debt["id"] | null;
  repaymentId: Repayment["id"] | null;
}>({ debtId: null, repaymentId: null });

export function EditRepaymentDialog() {
  const { isOpen, payload, close } = useEditRepaymentDialogStore();
  const { debtId, repaymentId } = payload;

  const {
    status,
    error,
    refetch,
    data: debt,
  } = useQuery({
    ...debtQueryOption(debtId ?? ""),
    enabled: isOpen,
  });

  const repayment = debt?.repayments.find((r) => r.id === repaymentId);

  const mutation = useEditRepaymentMutation();

  const defaultValues: z.input<typeof editRepaymentSchema> = {
    debtId: debt?.id ?? "",
    repaymentId: repayment?.id ?? "",
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
      close();
    },
  });

  async function handleOnOpenChange(open: boolean) {
    if (!open && form.state.isDirty) {
      const confirmed = await confirm("Discard editing repayment?", {
        description: "The repayment details you entered will be lost.",
        confirmLabel: "Keep Editing",
        cancelLabel: "Discard",
        dismissValue: true,
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
          <DialogTitle>Edit Repayment</DialogTitle>
          {debt && repayment ? (
            <DialogDescription>
              {repayment.bankAccount
                ? `Changes apply to the linked "${repayment.bankAccount.name}" transaction for "${debt.name}".`
                : `Update this off-app repayment against "${debt.name}".`}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div>
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
              title="Could not load repayment"
              description="We weren't able to retrieve this repayment. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {/* The Debt loaded, but the repayment went with its account or Transaction. */}
          {status === "success" && !repayment ? (
            <StateTemplate
              state="error"
              title="Repayment not found"
              description="This repayment doesn't exist or may have been deleted."
              content={
                <Button variant="secondary" onClick={close}>
                  Close
                </Button>
              }
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
                  {(field) => (
                    <field.Textarea label="Note (optional)" placeholder="Add a note..." />
                  )}
                </form.AppField>
              </FieldGroup>
            </form>
          ) : null}
        </div>
        {status === "success" && repayment ? (
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId}>Edit Repayment</form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
