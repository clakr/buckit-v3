import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { DialogState } from "#/lib/types";

import { CurrencyCombobox } from "#/components/currency-combobox";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { useAppForm } from "#/integrations/tanstack-form";
import { exceedsAvailable, describeInsufficientUnallocated } from "#/lib/money";
import { BankAccountSelectField } from "#/modules/bank-accounts/components/bank-account-select-field";
import { useRegisterBankAccountDialogStore } from "#/modules/bank-accounts/components/register-bank-account-dialog";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { useRecordDebtMutation } from "#/modules/debts/mutations";
import { confirm } from "#/stores/use-confirm";

import { debtDirectionEnum, recordDebtSchema } from "../schemas";

export const useRecordDebtDialogStore = create<DialogState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),
}));

export function RecordDebtDialog() {
  const { isOpen, closeDialog, toggleDialog } = useRecordDebtDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,
    })),
  );

  const mutation = useRecordDebtMutation();

  const defaultValues: z.input<typeof recordDebtSchema> = {
    name: "",
    direction: "receivable",
    currency: "PHP",
    amount: 0,
    date: new Date(),
    note: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: recordDebtSchema,
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

  const currency = useSelector(form.store, (state) => state.values.currency);
  const direction = useSelector(form.store, (state) => state.values.direction);

  const bankAccountsQuery = useQuery({
    ...bankAccountsQueryOption({ currency }),
    enabled: isOpen && direction === "receivable",
  });

  // Funding a loan takes money out, so only accounts with something left to lend can fund it.
  const eligibleSourceAccounts = bankAccountsQuery.data?.filter(
    (account) => account.unallocated > 0,
  );

  function openRegisterBankAccountDialog() {
    const state = useRegisterBankAccountDialogStore.getState();

    state.openDialog();
    state.setCurrency(currency);
  }

  function findSourceAccount(bankAccountId: string | undefined) {
    return bankAccountsQuery.data?.find((account) => account.id === bankAccountId);
  }

  async function handleOnOpenChange(open: boolean) {
    if (!open && form.state.isDirty) {
      const confirmed = await confirm("Discard new debt?", {
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
          <DialogTitle>Record Debt</DialogTitle>
          <DialogDescription>Track money you owe someone, or that they owe you.</DialogDescription>
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
              <form.AppField
                name="direction"
                listeners={{
                  onChange: ({ value }) => {
                    if (value === "receivable") return;

                    form.setFieldValue("bankAccountId", undefined);
                  },
                }}
              >
                {(field) => (
                  <field.RadioGroup
                    label="Direction"
                    options={Object.keys(debtDirectionEnum.enum).map((type) => ({
                      label: type,
                      value: type,
                    }))}
                  />
                )}
              </form.AppField>
              <form.AppField name="name">
                {(field) => <field.Input label="Counterparty Name" placeholder="John" required />}
              </form.AppField>
              <Field>
                <FieldLabel htmlFor="amount">Amount</FieldLabel>

                <InputGroup>
                  <InputGroupAddon>
                    <form.AppField name="currency">
                      {(field) => (
                        <CurrencyCombobox
                          value={field.state.value}
                          onValueChange={(value) => {
                            field.handleChange(value?.toString() ?? "");
                            // A picked source account is tied to the old currency.
                            form.setFieldValue("bankAccountId", undefined);
                          }}
                        />
                      )}
                    </form.AppField>
                  </InputGroupAddon>
                  <form.AppField
                    name="amount"
                    validators={{
                      // The source account can be picked, or cleared by a currency change,
                      // after the amount is in.
                      onChangeListenTo: ["bankAccountId"],
                      onChange: ({ value }) => {
                        const bankAccount = findSourceAccount(form.getFieldValue("bankAccountId"));
                        if (!bankAccount) return undefined;

                        return exceedsAvailable(value, bankAccount.unallocated)
                          ? {
                              message: describeInsufficientUnallocated({
                                purpose: "loan",
                                bankAccount,
                                available: bankAccount.unallocated,
                              }),
                            }
                          : undefined;
                      },
                    }}
                  >
                    {(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
                        <InputGroupInput
                          type="number"
                          id={field.name}
                          placeholder="0.00"
                          min={0.01}
                          step={0.01}
                          required
                          value={field.state.value as string}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          aria-invalid={isInvalid ? true : undefined}
                          aria-labelledby={isInvalid ? "amount-error" : undefined}
                        />
                      );
                    }}
                  </form.AppField>
                </InputGroup>
                <form.Subscribe selector={(state) => state.fieldMeta.amount?.errors}>
                  {(amountErrors) => <FieldError id="amount-error" errors={amountErrors} />}
                </form.Subscribe>
              </Field>
              {direction === "receivable" ? (
                <form.AppField name="bankAccountId">
                  {() => (
                    <BankAccountSelectField
                      label="Funding Source"
                      description="Optional — leave empty if this isn't coming out of a tracked account."
                      placeholder="No source account"
                      currency={currency}
                      bankAccountsQuery={bankAccountsQuery}
                      bankAccounts={eligibleSourceAccounts}
                      emptyContent={
                        <>
                          <FieldError>No {currency} accounts with available balance.</FieldError>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={openRegisterBankAccountDialog}
                          >
                            Register a/an {currency} account
                          </Button>
                        </>
                      }
                    />
                  )}
                </form.AppField>
              ) : (
                <p className="text-muted-foreground">
                  No account needed yet — this is recorded as a pure IOU until you log a repayment.
                </p>
              )}
              <form.AppField name="date">
                {(field) => <field.Datepicker label="Date" />}
              </form.AppField>
              <form.AppField name="note">
                {(field) => <field.Textarea label="Note (optional)" placeholder="Add a note..." />}
              </form.AppField>
            </FieldGroup>
          </form>
        </div>
        <DialogFooter>
          <form.AppForm>
            <form.Button form={form.formId}>Record Debt</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
