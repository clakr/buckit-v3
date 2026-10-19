import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import z from "zod";

import type { BankAccount, Bucket } from "#/db/schema";

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
import { formatMoney, exceedsAvailable, describeInsufficientUnallocated } from "#/lib/money";
import { getCurrency, isCurrencyCode } from "#/lib/utils";
import { useLogAllocationMutation } from "#/modules/allocations/mutations";
import { logAllocationSchema } from "#/modules/allocations/schemas";
import { BankAccountSelectField } from "#/modules/bank-accounts/components/bank-account-select-field";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { bucketsQueryOptions } from "#/modules/buckets/query-options";
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

/** The side the dialog was opened from, which stays fixed; the other side is picked. */
export type LogAllocationStart =
  | { from: "bank-account"; bankAccountId: BankAccount["id"] }
  | { from: "bucket"; bucketId: Bucket["id"] };

export const useLogAllocationDialogStore = createDialogStore<{ start: LogAllocationStart | null }>({
  start: null,
});

export function LogAllocationDialog() {
  const { isOpen, payload, close } = useLogAllocationDialogStore();
  const { start } = payload;

  const mutation = useLogAllocationMutation();

  const defaultValues: z.input<typeof logAllocationSchema> = {
    bankAccountId: start?.from === "bank-account" ? start.bankAccountId : "",
    bucketId: start?.from === "bucket" ? start.bucketId : "",
    amount: 0,
    date: new Date(),
    note: "",
  };

  const {
    status: bucketsStatus,
    refetch: refetchBuckets,
    data: buckets,
  } = useQuery({
    ...bucketsQueryOptions,
    enabled: isOpen && start !== null,
  });

  const {
    status: bankAccountsStatus,
    refetch: refetchBankAccounts,
    data: bankAccounts,
  } = useQuery({
    ...bankAccountsQueryOption(),
    enabled: isOpen && start !== null,
  });

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: logAllocationSchema,
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

  const bankAccountId = useSelector(form.store, (state) => state.values.bankAccountId);
  const bucketId = useSelector(form.store, (state) => state.values.bucketId);

  async function handleOnOpenChange(open: boolean) {
    if (!open && form.state.isDirty) {
      const confirmed = await confirm("Discard new allocation?", {
        description: "The allocation details you entered will be lost.",
        confirmLabel: "Keep Editing",
        cancelLabel: "Discard",
        dismissValue: true,
      });

      if (confirmed) return;
    }

    form.reset();

    close();
  }

  if (!start) return null;

  // Both sides come from the live lists, whichever side the dialog was opened from, so the
  // account's Available is never a copy taken when it opened. Validators run before the next
  // render, so they look the account up by the form's current value.
  function findBankAccount(id: string) {
    return bankAccounts?.find((a) => a.id === id);
  }

  const fixedName =
    start.from === "bank-account"
      ? findBankAccount(start.bankAccountId)?.name
      : buckets?.find((b) => b.id === start.bucketId)?.name;

  const selectedBankAccount = findBankAccount(bankAccountId);

  const currencyCode = selectedBankAccount?.currency;
  const currency = currencyCode && isCurrencyCode(currencyCode) ? getCurrency(currencyCode) : null;

  const unallocated = selectedBankAccount?.unallocated ?? null;

  const isAmountDisabled = !bankAccountId || !bucketId;

  const isPending = bankAccountsStatus === "pending" || bucketsStatus === "pending";

  // The form can't be filled in without the lists it picks from.
  const loadError =
    bankAccountsStatus === "error"
      ? { noun: "bank accounts", retry: refetchBankAccounts }
      : bucketsStatus === "error"
        ? { noun: "buckets", retry: refetchBuckets }
        : null;

  const isLoaded = bankAccountsStatus === "success" && bucketsStatus === "success";

  // Deleted since the menu that opened the dialog was drawn.
  const isFixedSideGone = isLoaded && fixedName === undefined;

  const isReady = isLoaded && !isFixedSideGone;

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Allocate Money</DialogTitle>
          {isReady ? (
            <DialogDescription>
              {start.from === "bank-account"
                ? `Move money from ${fixedName} into a bucket.`
                : `Move money into ${fixedName} from a bank account.`}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div>
          {isPending && !loadError ? (
            <StateTemplate
              state="loading"
              title="Loading"
              description="Fetching your bank accounts and buckets..."
            />
          ) : null}
          {loadError ? (
            <StateTemplate
              state="error"
              title={`Could not load ${loadError.noun}`}
              description={`We weren't able to retrieve your ${loadError.noun}. Please check your connection and try again.`}
              content={<Button onClick={() => loadError.retry()}>Retry</Button>}
            />
          ) : null}
          {isFixedSideGone ? (
            <StateTemplate
              state="error"
              title={start.from === "bank-account" ? "Bank account not found" : "Bucket not found"}
              description={
                start.from === "bank-account"
                  ? "This account doesn't exist or may have been deleted."
                  : "This bucket doesn't exist or may have been deleted."
              }
              content={
                <Button variant="secondary" onClick={close}>
                  Close
                </Button>
              }
            />
          ) : null}
          {isReady ? (
            <form
              id={form.formId}
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
              <FieldGroup>
                {/* Reads as a sentence. From a bucket: "From BPI, set aside ₱500" (the amount needs
                  the account's currency). From an account: "Set aside ₱500 into Emergency". */}
                {start.from === "bucket" ? (
                  <form.AppField name="bankAccountId">
                    {() => (
                      <BankAccountSelectField
                        label="Bank Account"
                        description={null}
                        placeholder="Select bank account"
                        currency={null}
                        bankAccountsQuery={{
                          status: bankAccountsStatus,
                          refetch: refetchBankAccounts,
                        }}
                        bankAccounts={bankAccounts}
                        emptyContent={
                          <p className="text-muted-foreground">
                            You have no bank accounts to allocate from yet.
                          </p>
                        }
                      />
                    )}
                  </form.AppField>
                ) : null}
                <form.AppField
                  name="amount"
                  validators={{
                    // From a bucket, the account is picked after the amount may already be in.
                    onChangeListenTo: ["bankAccountId"],
                    onChange: ({ value }) => {
                      const bankAccount = findBankAccount(form.getFieldValue("bankAccountId"));
                      if (!bankAccount) return undefined;

                      return exceedsAvailable(value, bankAccount.unallocated)
                        ? {
                            message: describeInsufficientUnallocated({
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
                      currency={currencyCode}
                      disabled={isAmountDisabled || !currency}
                      description={
                        currency && unallocated !== null ? (
                          <>
                            Available:{" "}
                            <span className="font-semibold">
                              {formatMoney(unallocated, currency.code)}
                            </span>
                          </>
                        ) : undefined
                      }
                    />
                  )}
                </form.AppField>
                {start.from === "bank-account" ? (
                  <form.AppField name="bucketId">
                    {(field) => {
                      const options = buckets?.map((b) => ({ value: b.id, label: b.name })) ?? [];

                      return (
                        <field.Select
                          label="Bucket"
                          items={options}
                          disabled={!options.length}
                          placeholder="Select bucket"
                          options={options}
                        />
                      );
                    }}
                  </form.AppField>
                ) : null}
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
        {isReady ? (
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId}>Allocate Money</form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
