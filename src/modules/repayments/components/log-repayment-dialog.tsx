import { IconAlertCircle, IconCalendar } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { Debt } from "#/db/schema";
import type { DialogState } from "#/lib/types";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "#/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
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
import { formatCurrency, getCurrency, isCurrencyCode } from "#/lib/utils";
import { BankAccountFigures } from "#/modules/bank-accounts/components/bank-account-figures";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { getBankAccountUnallocatedBalance } from "#/modules/bank-accounts/utils";
import { confirm } from "#/stores/use-confirm";

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
              <form.AppField name="bankAccountId">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  const id = field.name;
                  const errorId = `${id}-error`;

                  const disabled =
                    status !== "success" || !bankAccounts || bankAccounts.length === 0;

                  const items = bankAccounts?.map((a) => ({ value: a.id, label: a.name }));

                  const selected = bankAccounts?.find((a) => a.id === field.state.value);
                  const selectedFigures = selected
                    ? getBankAccountUnallocatedBalance({
                        startingBalance: selected.startingBalance,
                        transactions: selected.transactions,
                        allocations: selected.allocations,
                      })
                    : null;

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
                              const { balance, unallocated } = getBankAccountUnallocatedBalance({
                                startingBalance: account.startingBalance,
                                transactions: account.transactions,
                                allocations: account.allocations,
                              });

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
                        selectedFigures &&
                        (selectedFigures.balance === selectedFigures.unallocated ? (
                          <FieldDescription>
                            Balance{" "}
                            {formatCurrency(currencyCodec.encode(selectedFigures.balance), {
                              currency: selected.currency,
                            })}
                          </FieldDescription>
                        ) : (
                          <FieldDescription>
                            Balance{" "}
                            {formatCurrency(currencyCodec.encode(selectedFigures.balance), {
                              currency: selected.currency,
                            })}{" "}
                            · Unallocated{" "}
                            {formatCurrency(currencyCodec.encode(selectedFigures.unallocated), {
                              currency: selected.currency,
                            })}
                          </FieldDescription>
                        ))}

                      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.AppField>
              <form.AppField name="amount">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  const id = field.name;
                  const errorId = `${id}-error`;

                  const accountCurrency = debt.currency;

                  const validated = isCurrencyCode(accountCurrency);
                  if (!validated) return null;

                  const currency = getCurrency(accountCurrency);
                  if (!currency) return null;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={id}>Amount</FieldLabel>

                      <InputGroup>
                        <InputGroupAddon>
                          <InputGroupText>{currency.symbol}</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          type="number"
                          id={field.name}
                          placeholder="0.00"
                          min={0}
                          step={0.01}
                          required
                          value={field.state.value as string}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          aria-invalid={isInvalid ? true : undefined}
                          aria-labelledby={isInvalid ? errorId : undefined}
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupText>{currency.code}</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>

                      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.AppField>
              <form.AppField name="date">
                {(field) => {
                  const date = field.state.value;

                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  const id = field.name;
                  const errorId = `${id}-error`;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={id}>Date</FieldLabel>

                      <Popover>
                        <PopoverTrigger
                          render={
                            <Button
                              id={id}
                              variant="outline"
                              data-empty={!date}
                              className="justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
                              aria-invalid={isInvalid ? true : undefined}
                              aria-labelledby={isInvalid ? errorId : undefined}
                            />
                          }
                        >
                          <IconCalendar />
                          {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(value) => field.handleChange(value ?? new Date())}
                            onDayBlur={field.handleBlur}
                          />
                        </PopoverContent>
                      </Popover>

                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
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
