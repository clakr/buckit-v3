import { useQuery } from "@tanstack/react-query";
import z from "zod";

import type { BankAccount } from "#/db/schema";

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
import { describeInsufficientUnallocated, exceedsAvailable, formatMoney } from "#/lib/money";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { useLogTransactionMutation } from "#/modules/transactions/mutations";
import { logTransactionSchema, transactionTypeEnum } from "#/modules/transactions/schemas";
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

export const useLogTransactionDialogStore = createDialogStore<{
  bankAccountId: BankAccount["id"] | null;
}>({ bankAccountId: null });

export function LogTransactionDialog() {
  const { isOpen, payload, close } = useLogTransactionDialogStore();
  const { bankAccountId } = payload;

  const {
    status,
    refetch,
    data: bankAccounts,
  } = useQuery({
    ...bankAccountsQueryOption(),
    enabled: isOpen,
  });

  const account = bankAccounts?.find((bankAccount) => bankAccount.id === bankAccountId);

  const mutation = useLogTransactionMutation();

  const defaultValues: z.input<typeof logTransactionSchema> = {
    bankAccountId: bankAccountId ?? "",
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
      close();
    },
  });

  async function handleOnOpenChange(open: boolean) {
    if (!open && form.state.isDirty) {
      const confirmed = await confirm("Discard new transaction?", {
        description: "The transaction details you entered will be lost.",
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
          <DialogTitle>Log Transaction</DialogTitle>
          <DialogDescription>
            {account
              ? `Record a deposit or withdrawal for "${account.name}".`
              : "Record a deposit or withdrawal for this account."}
          </DialogDescription>
        </DialogHeader>
        <div>
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
              content={
                <Button variant="secondary" onClick={close}>
                  Close
                </Button>
              }
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
                  {(field) => (
                    <field.Textarea label="Note (optional)" placeholder="Add a note..." />
                  )}
                </form.AppField>
              </FieldGroup>
            </form>
          ) : null}
        </div>
        {status === "success" && account ? (
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId}>Log Transaction</form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
