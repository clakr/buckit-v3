import { useQuery } from "@tanstack/react-query";
import z from "zod";

import type { Debt } from "#/db/schema";

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
import { exceedsAvailable, describeInsufficientUnallocated } from "#/lib/money";
import { BankAccountSelectField } from "#/modules/bank-accounts/components/bank-account-select-field";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { debtQueryOption } from "#/modules/debts/query-options";
import { getLinkedTransactionType } from "#/modules/debts/utils";
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

import { useLogRepaymentMutation } from "../mutations";
import { logRepaymentSchema } from "../schemas";
import { getRepaymentDateRule } from "../utils";

export const useLogRepaymentDialogStore = createDialogStore<{ debtId: Debt["id"] | null }>({
  debtId: null,
});

export function LogRepaymentDialog() {
  const { isOpen, payload, close } = useLogRepaymentDialogStore();
  const { debtId } = payload;

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
      close();
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

    close();
  }

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
                <Button variant="secondary" onClick={close}>
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
                    onChangeListenTo: ["bankAccountId"],
                    onChange: ({ value }) => {
                      if (!isPayingOut) return undefined;

                      const bankAccount = bankAccounts?.find(
                        (account) => account.id === form.getFieldValue("bankAccountId"),
                      );
                      if (!bankAccount) return undefined;

                      return exceedsAvailable(value, bankAccount.unallocated)
                        ? {
                            message: describeInsufficientUnallocated({
                              purpose: "repayment",
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
