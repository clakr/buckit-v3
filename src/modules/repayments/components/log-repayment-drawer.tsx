import { useQuery } from "@tanstack/react-query";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import type { Debt } from "#/db/schema";

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
import { exceedsAvailable, describeInsufficientUnallocated } from "#/lib/money";
import { BankAccountSelectField } from "#/modules/bank-accounts/components/bank-account-select-field";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { debtQueryOption } from "#/modules/debts/query-options";
import { getLinkedTransactionType } from "#/modules/debts/utils";
import { confirm } from "#/stores/use-confirm";

import { useLogRepaymentMutation } from "../mutations";
import { logRepaymentSchema } from "../schemas";
import { getRepaymentDateRule } from "../utils";

export const logRepaymentDrawerHandle = createDrawerHandle<{ debtId: Debt["id"] }>();

type LogRepaymentFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function LogRepaymentDrawer() {
  const formControlsRef = useRef<LogRepaymentFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard new repayment?", {
      description: "The repayment details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    logRepaymentDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={logRepaymentDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          {payload ? <LogRepaymentForm debtId={payload.debtId} ref={formControlsRef} /> : null}
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}

type LogRepaymentFormProps = {
  debtId: Debt["id"];
  ref: Ref<LogRepaymentFormControls>;
};

function LogRepaymentForm({ debtId, ref }: LogRepaymentFormProps) {
  const {
    status: debtStatus,
    error: debtError,
    refetch: refetchDebt,
    data: debt,
  } = useQuery(debtQueryOption(debtId));

  const mutation = useLogRepaymentMutation();

  const defaultValues: z.input<typeof logRepaymentSchema> = {
    debtId,
    bankAccountId: null,
    amount: 0,
    date: new Date(),
    note: "",
  };

  const {
    status: bankAccountsStatus,
    data: bankAccounts,
    refetch: refetchBankAccounts,
  } = useQuery({
    ...bankAccountsQueryOption({ currency: debt?.currency }),
    enabled: debt !== undefined,
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
      logRepaymentDrawerHandle.close();
    },
  });

  useImperativeHandle(
    ref,
    () => ({ isDirty: () => form.state.isDirty, reset: () => form.reset() }),
    [form],
  );

  const isPayingOut =
    debt !== undefined && getLinkedTransactionType(debt.direction, "repayment") === "expense";

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Log Repayment</DrawerTitle>
        <DrawerDescription>
          {debt ? `Record a payment against "${debt.name}".` : "Record a payment against a debt."}
        </DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
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
                            availableCents: bankAccount.unallocated,
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
                    description="Optional. Leave it empty if no money moved through a tracked account."
                    placeholder="No bank account"
                    currency={debt.currency}
                    bankAccountsQuery={{ status: bankAccountsStatus, refetch: refetchBankAccounts }}
                    bankAccounts={bankAccounts}
                    emptyContent={
                      <p className="text-muted-foreground">
                        No {debt.currency} accounts, so this repayment is logged without one.
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
                {(field) => <field.Textarea label="Note (optional)" placeholder="Add a note..." />}
              </form.AppField>
            </FieldGroup>
          </form>
        ) : null}
      </div>
      {debtStatus === "success" ? (
        <DrawerFooter className="border-t pt-4">
          <form.AppForm>
            <form.Button form={form.formId}>Log Repayment</form.Button>
          </form.AppForm>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      ) : null}
    </>
  );
}
