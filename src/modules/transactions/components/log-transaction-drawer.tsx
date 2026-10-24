import { useQuery } from "@tanstack/react-query";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import type { BankAccount } from "#/db/schema";

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
import { describeInsufficientUnallocated, exceedsAvailable, formatMoney } from "#/lib/money";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { useLogTransactionMutation } from "#/modules/transactions/mutations";
import { logTransactionSchema, transactionTypeEnum } from "#/modules/transactions/schemas";
import { confirm } from "#/stores/use-confirm";

export const logTransactionDrawerHandle = createDrawerHandle<{
  bankAccountId: BankAccount["id"];
}>();

type LogTransactionFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function LogTransactionDrawer() {
  const formControlsRef = useRef<LogTransactionFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard new transaction?", {
      description: "The transaction details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    logTransactionDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={logTransactionDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          {payload ? (
            <LogTransactionForm bankAccountId={payload.bankAccountId} ref={formControlsRef} />
          ) : null}
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}

type LogTransactionFormProps = {
  bankAccountId: BankAccount["id"];
  ref: Ref<LogTransactionFormControls>;
};

function LogTransactionForm({ bankAccountId, ref }: LogTransactionFormProps) {
  const { status, refetch, data: bankAccounts } = useQuery(bankAccountsQueryOption());

  const account = bankAccounts?.find((bankAccount) => bankAccount.id === bankAccountId);

  const mutation = useLogTransactionMutation();

  const defaultValues: z.input<typeof logTransactionSchema> = {
    bankAccountId,
    type: "income",
    amount: 0,
    date: new Date(),
    note: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: logTransactionSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      logTransactionDrawerHandle.close();
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
        <DrawerTitle>Log Transaction</DrawerTitle>
        <DrawerDescription>
          {account
            ? `Record a deposit or withdrawal for "${account.name}".`
            : "Record a deposit or withdrawal for this account."}
        </DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {status === "pending" ? (
          <StateTemplate
            state="loading"
            title="Loading account"
            description="Fetching account details..."
          />
        ) : null}
        {status === "error" ? (
          <StateTemplate
            state="error"
            title="Could not load accounts"
            description="We weren't able to retrieve your accounts. Please check your connection and try again."
            content={<Button onClick={() => refetch()}>Retry</Button>}
          />
        ) : null}
        {status === "success" && !account ? (
          <StateTemplate
            state="error"
            title="Account not found"
            description="This account doesn't exist or may have been deleted."
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
          />
        ) : null}
        {status === "success" && account ? (
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
                  />
                )}
              </form.AppField>
              <form.AppField
                name="amount"
                validators={{
                  onChangeListenTo: ["type"],
                  onChange: ({ value }) =>
                    form.getFieldValue("type") === "expense" &&
                    exceedsAvailable(value, account.unallocated)
                      ? {
                          message: describeInsufficientUnallocated({
                            bankAccount: account,
                            availableCents: account.unallocated,
                          }),
                        }
                      : undefined,
                }}
              >
                {(field) => (
                  <form.Subscribe selector={(state) => state.values.type}>
                    {(type) => (
                      <field.AmountInput
                        label="Amount"
                        min={0.01}
                        step={0.01}
                        required
                        placeholder="0.00"
                        currency={account.currency}
                        description={
                          type === "expense" ? (
                            <>
                              Available:{" "}
                              <span className="font-semibold">
                                {formatMoney(account.unallocated, account.currency)}
                              </span>
                            </>
                          ) : undefined
                        }
                      />
                    )}
                  </form.Subscribe>
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
      {status === "success" && account ? (
        <DrawerFooter className="border-t pt-4">
          <form.AppForm>
            <form.Button form={form.formId}>Log Transaction</form.Button>
          </form.AppForm>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      ) : null}
    </>
  );
}
