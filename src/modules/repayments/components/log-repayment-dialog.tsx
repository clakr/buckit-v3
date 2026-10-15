import { IconAlertCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { format, isBefore, startOfDay } from "date-fns";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { Debt } from "#/db/schema";
import type { DialogState } from "#/lib/types";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { useAppForm } from "#/integrations/tanstack-form";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";
import { BankAccountFigures } from "#/modules/bank-accounts/components/bank-account-figures";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { confirm } from "#/stores/use-confirm";

import { validateLogRepaymentBalance, validateLogRepaymentCurrency } from "../functions";
import { useLogRepaymentMutation } from "../mutations";
import { logRepaymentSchema } from "../schemas";

type StoreState = DialogState & {
  debt: Debt | null;
  setDebt: (debt: Debt) => void;
};

export const useLogRepaymentDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  debt: null,
  setDebt: (debt) => set({ debt }),
}));

export function LogRepaymentDialog() {
  const { isOpen, closeDialog, toggleDialog, debt } = useLogRepaymentDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      debt: state.debt,
    })),
  );

  const mutation = useLogRepaymentMutation();

  const defaultValues: z.input<typeof logRepaymentSchema> = {
    debtId: debt?.id ?? "",
    bankAccountId: null,
    amount: 0,
    date: new Date(),
    note: "",
  };

  // @todo: handle error
  const { status, data: bankAccounts } = useQuery({
    ...bankAccountsQueryOption({ currency: debt?.currency }),
    enabled: isOpen,
  });

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: logRepaymentSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          const currency = await validateLogRepaymentCurrency({ data: value });
          if (!currency.isValid) return currency.message;

          const balance = await validateLogRepaymentBalance({ data: value });
          if (!balance.isValid) return balance.message;

          return undefined;
        } catch (error) {
          console.error(error);

          // A thrown validator would otherwise be an uncaught rejection that crashes the app.
          return "Something went wrong while checking this. Please try again.";
        }
      },
    },
    onSubmit: async ({ value: data }) => {
      if (debt?.forgivenAt) {
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

  if (!debt) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Repayment</DialogTitle>
          <DialogDescription>Record a payment against "{debt.name}".</DialogDescription>
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
              <form.AppField name="bankAccountId">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  const id = field.name;
                  const errorId = `${id}-error`;

                  const disabled =
                    status !== "success" || !bankAccounts || bankAccounts.length === 0;

                  const items = bankAccounts?.map((a) => ({ value: a.id, label: a.name }));

                  const selected = bankAccounts?.find((a) => a.id === field.state.value);

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={id}>Bank Account</FieldLabel>
                      <FieldDescription>
                        Optional — leave empty if this isn't a real money movement.
                      </FieldDescription>

                      <Select
                        items={items}
                        value={field.state.value ?? ""}
                        onValueChange={(value) => field.handleChange((value as string) || null)}
                        disabled={disabled}
                      >
                        <SelectTrigger
                          id={id}
                          className="w-full"
                          onBlur={field.handleBlur}
                          aria-invalid={isInvalid ? true : undefined}
                          aria-labelledby={isInvalid ? errorId : undefined}
                        >
                          <SelectValue placeholder="No bank account" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {bankAccounts?.map((account) => {
                              const { balance, unallocated } = account;

                              return (
                                <SelectItem key={account.id} value={account.id}>
                                  <div className="flex w-full flex-col items-start gap-0.5">
                                    <span className="font-medium">{account.name}</span>
                                    <BankAccountFigures
                                      balance={balance}
                                      unallocated={unallocated}
                                      currency={account.currency}
                                      className="text-[11px]"
                                    />
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      {selected &&
                        (selected.balance === selected.unallocated ? (
                          <FieldDescription>
                            Balance{" "}
                            <span className="font-semibold">
                              {formatCurrency(currencyCodec.encode(selected.balance), {
                                currency: selected.currency,
                              })}
                            </span>
                          </FieldDescription>
                        ) : (
                          <FieldDescription>
                            Balance{" "}
                            <span className="font-semibold">
                              {formatCurrency(currencyCodec.encode(selected.balance), {
                                currency: selected.currency,
                              })}
                            </span>{" "}
                            · Unallocated{" "}
                            <span className="font-semibold">
                              {formatCurrency(currencyCodec.encode(selected.unallocated), {
                                currency: selected.currency,
                              })}
                            </span>
                          </FieldDescription>
                        ))}

                      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.AppField>
              <form.AppField
                name="date"
                validators={{
                  // By calendar day, so a repayment on the day the Debt was recorded is fine
                  // whatever time of day either was saved with.
                  onChange: logRepaymentSchema.shape.date.refine(
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
              <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
                {(error) =>
                  error ? (
                    <Alert variant="destructive" className="max-w-md">
                      <IconAlertCircle />
                      <AlertTitle>Log Repayment failed</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null
                }
              </form.Subscribe>
            </FieldGroup>
          </form>
        </div>
        <DialogFooter>
          <form.AppForm>
            <form.Button form={form.formId}>Log Repayment</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
