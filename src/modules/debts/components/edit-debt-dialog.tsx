import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { Debt } from "#/db/schema";
import type { DialogState } from "#/lib/types";

import { StateTemplate } from "#/components/state-template";
import { Badge } from "#/components/ui/badge";
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
import { useEditDebtMutation } from "#/modules/debts/mutations";
import { debtQueryOption } from "#/modules/debts/query-options";
import { editDebtSchema } from "#/modules/debts/schemas";
import { confirm } from "#/stores/use-confirm";

type StoreState = DialogState & {
  debtId: Debt["id"] | null;
  setDebtId: (debtId: Debt["id"]) => void;
};

export const useEditDebtDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  debtId: null,
  setDebtId: (debtId) => set({ debtId }),
}));

export function EditDebtDialog() {
  const { isOpen, closeDialog, toggleDialog, debtId } = useEditDebtDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      debtId: state.debtId,
    })),
  );

  const {
    status,
    error,
    refetch,
    data: debt,
  } = useQuery({
    ...debtQueryOption(debtId ?? ""),
    enabled: isOpen,
  });

  const mutation = useEditDebtMutation();

  const isAmountLocked = debt?.direction === "receivable";

  const defaultValues: z.input<typeof editDebtSchema> = {
    debtId: debt?.id ?? "",
    name: debt?.name ?? "",
    amount: centsToAmountInput(debt?.amount ?? 0),
    date: debt?.date ?? new Date(),
    note: debt?.note ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: editDebtSchema,
    },
    onSubmit: async ({ value }) => {
      // A receivable's amount is locked, so it's never sent — the server rejects it.
      const data = isAmountLocked ? { ...value, amount: undefined } : value;

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
      const confirmed = await confirm("Discard editing debt?", {
        description: "The debt details you entered will be lost.",
        confirmLabel: "Keep Editing",
        cancelLabel: "Discard",
        dismissValue: true,
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
          <DialogTitle className="flex items-center gap-x-2">
            Edit Debt
            {debt ? (
              <Badge
                variant={debt.direction === "receivable" ? "default" : "secondary"}
                className="capitalize"
              >
                {debt.direction}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>Update the details of this debt.</DialogDescription>
        </DialogHeader>
        <div>
          {status === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading debt"
              description="Fetching debt details..."
            />
          ) : null}
          {status === "error" && error instanceof NotFoundError ? (
            <StateTemplate
              state="error"
              title="Debt not found"
              description={error.message}
              content={
                <Button variant="secondary" onClick={closeDialog}>
                  Close
                </Button>
              }
            />
          ) : null}
          {status === "error" && !(error instanceof NotFoundError) ? (
            <StateTemplate
              state="error"
              title="Could not load debt"
              description="We weren't able to retrieve this debt. Please check your connection and try again."
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
                <form.AppField name="name">
                  {(field) => <field.Input label="Counterparty Name" maxLength={100} required />}
                </form.AppField>
                <form.AppField name="amount">
                  {(field) => (
                    <field.AmountInput
                      label="Amount"
                      min={0.01}
                      step={0.01}
                      required
                      placeholder="0.00"
                      currency={debt.currency}
                      locked={isAmountLocked}
                      description={
                        isAmountLocked
                          ? "A receivable's amount is locked once recorded. To correct it, delete this debt and record it again."
                          : undefined
                      }
                    />
                  )}
                </form.AppField>
                <form.AppField name="date">
                  {(field) => <field.Datepicker label="Date" />}
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
              <form.Button form={form.formId}>Edit Debt</form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
