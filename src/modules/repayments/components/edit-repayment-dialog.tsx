import { format, isBefore, startOfDay } from "date-fns";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { Repayment } from "#/db/schema";
import type { DialogState } from "#/lib/types";
import type { getDebt } from "#/modules/debts/functions";

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
import { currencyCodec } from "#/lib/codecs";
import { confirm } from "#/stores/use-confirm";

import { useEditRepaymentMutation } from "../mutations";
import { editRepaymentSchema } from "../schemas";

type DebtWithRepayments = NonNullable<Awaited<ReturnType<typeof getDebt>>>;

type StoreState = DialogState & {
  debt: DebtWithRepayments | null;
  repaymentId: Repayment["id"] | null;
  setRepayment: (debt: DebtWithRepayments, repaymentId: Repayment["id"]) => void;
};

export const useEditRepaymentDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  debt: null,
  repaymentId: null,
  setRepayment: (debt, repaymentId) => set({ debt, repaymentId }),
}));

export function EditRepaymentDialog() {
  const { isOpen, closeDialog, toggleDialog, debt, repaymentId } = useEditRepaymentDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      debt: state.debt,
      repaymentId: state.repaymentId,
    })),
  );

  const repayment = debt?.repayments.find((r) => r.id === repaymentId);

  const mutation = useEditRepaymentMutation();

  const defaultValues: z.input<typeof editRepaymentSchema> = {
    debtId: debt?.id ?? "",
    repaymentId: repayment?.id ?? "",
    amount: currencyCodec.encode(repayment?.amount ?? 0),
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
      closeDialog();
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

    toggleDialog();
  }

  if (!debt || !repayment) return null;

  const { bankAccount } = repayment;

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Repayment</DialogTitle>
          <DialogDescription>
            {bankAccount
              ? `Changes apply to the linked "${bankAccount.name}" transaction for "${debt.name}".`
              : `Update this off-app repayment against "${debt.name}".`}
          </DialogDescription>
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
                  // By calendar day, so a repayment on the day the Debt was recorded is fine
                  // whatever time of day either was saved with.
                  onChange: editRepaymentSchema.shape.date.refine(
                    (value) => !isBefore(value, startOfDay(debt.date)),
                    `Can't be before the debt was recorded (${format(debt.date, "PPP")}).`,
                  ),
                }}
              >
                {(field) => <field.Datepicker label="Date" disabled={{ before: debt.date }} />}
              </form.AppField>
              <form.AppField name="note">
                {(field) => <field.Textarea label="Note (optional)" placeholder="Add a note..." />}
              </form.AppField>
            </FieldGroup>
          </form>
        </div>
        <DialogFooter>
          <form.AppForm>
            <form.Button form={form.formId}>Edit Repayment</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
