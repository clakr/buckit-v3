import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { Debt } from "#/db/schema";
import type { DialogState } from "#/lib/types";

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
import { currencyCodec } from "#/lib/codecs";
import { NotFoundError } from "#/lib/errors";
import { BankAccountSelectField } from "#/modules/bank-accounts/components/bank-account-select-field";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { debtQueryOption } from "#/modules/debts/query-options";
import { getLinkedTransactionType } from "#/modules/debts/utils";
import { confirm } from "#/stores/use-confirm";

import { useLogRepaymentMutation } from "../mutations";
import { logRepaymentSchema } from "../schemas";
import { describeInsufficientRepaymentAccount, getRepaymentDateRule } from "../utils";

type StoreState = DialogState & {
  debtId: Debt["id"] | null;
  setDebtId: (debtId: Debt["id"]) => void;
};

export const useLogRepaymentDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  debtId: null,
  setDebtId: (debtId) => set({ debtId }),
}));

export function LogRepaymentDialog() {
  const { isOpen, closeDialog, toggleDialog, debtId } = useLogRepaymentDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      debtId: state.debtId,
    })),
  );

  const {
    status: debtStatus,
    error: debtError,
    refetch: refetchDebt,
    data: debt,
  } = useQuery({
    ...debtQueryOption(debtId ?? ""),
    enabled: isOpen,
  });

  const mutation = useLogRepaymentMutation();

  const defaultValues: z.input<typeof logRepaymentSchema> = {
    debtId: debt?.id ?? "",
    bankAccountId: null,
    amount: 0,
    date: new Date(),
    note: "",
  };

  const {
    status,
    data: bankAccounts,
    refetch,
  } = useQuery({
    ...bankAccountsQueryOption({ currency: debt?.currency }),
    enabled: isOpen && debt !== undefined,
  });

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: logRepaymentSchema,
    },
    onSubmit: async ({ value: data }) => {
      if (debt?.status === "forgiven") {
        const confirmed = await confirm(`Reopen "${debt.name}"?`, {
          description:
            "This debt was forgiven. Logging a repayment reopens it, and the forgiveness is lifted.",
          confirmLabel: "Log & Reopen",
          cancelLabel: "Cancel",
        });

        if (!confirmed) return;
      }

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
      const confirmed = await confirm("Discard new repayment?", {
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

  // Money only leaves the account on a payable; a receivable's repayment can't overdraw it.
  const isPayingOut =
    debt !== undefined && getLinkedTransactionType(debt.direction, "repayment") === "expense";

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Repayment</DialogTitle>
          {debt ? (
            <DialogDescription>Record a payment against "{debt.name}".</DialogDescription>
          ) : null}
        </DialogHeader>
        <div>
          {debtStatus === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading debt"
              description="Fetching debt details..."
            />
          ) : null}
          {debtStatus === "error" && debtError instanceof NotFoundError ? (
            <StateTemplate
              state="error"
              title="Debt not found"
              description={debtError.message}
              content={
                <Button variant="secondary" onClick={closeDialog}>
                  Close
                </Button>
              }
            />
          ) : null}
          {debtStatus === "error" && !(debtError instanceof NotFoundError) ? (
            <StateTemplate
              state="error"
              title="Could not load debt"
              description="We weren't able to retrieve this debt. Please check your connection and try again."
              content={<Button onClick={() => refetchDebt()}>Retry</Button>}
            />
          ) : null}
          {debtStatus === "success" ? (
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
                    // The account can be picked after the amount is in.
                    onChangeListenTo: ["bankAccountId"],
                    onChange: ({ value }) => {
                      if (!isPayingOut) return undefined;

                      const bankAccount = bankAccounts?.find(
                        (account) => account.id === form.getFieldValue("bankAccountId"),
                      );
                      if (!bankAccount) return undefined;

                      return currencyCodec.decode(Number(value)) > bankAccount.unallocated
                        ? {
                            message: describeInsufficientRepaymentAccount({
                              bankAccount,
                              available: bankAccount.unallocated,
                            }),
                          }
                        : undefined;
                    },
                  }}
                >
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
                <form.AppField name="bankAccountId">
                  {() => (
                    <BankAccountSelectField
                      label="Bank Account"
                      description="Optional — leave empty if this isn't a real money movement."
                      placeholder="No bank account"
                      currency={debt.currency}
                      bankAccountsQuery={{ status, refetch }}
                      bankAccounts={bankAccounts}
                      emptyContent={
                        <p className="text-muted-foreground">
                          No {debt.currency} accounts — this repayment is recorded without one.
                        </p>
                      }
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
        {debtStatus === "success" ? (
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId}>Log Repayment</form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
