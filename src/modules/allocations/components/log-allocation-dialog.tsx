import { IconCalendar } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { Bucket } from "#/db/schema";
import type { DialogState } from "#/lib/types";
import type { getBankAccounts } from "#/modules/bank-accounts/functions";

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
import { Spinner } from "#/components/ui/spinner";
import { useAppForm } from "#/integrations/tanstack-form";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency, getCurrency, isCurrencyCode } from "#/lib/utils";
import { validateLogAllocationAmount } from "#/modules/allocations/functions";
import { useLogAllocationMutation } from "#/modules/allocations/mutations";
import { logAllocationSchema } from "#/modules/allocations/schemas";
import { BankAccountFigures } from "#/modules/bank-accounts/components/bank-account-figures";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { getBankAccountUnallocatedBalance } from "#/modules/bank-accounts/utils";
import { bucketsQueryOptions } from "#/modules/buckets/query-options";
import { confirm } from "#/stores/use-confirm";

export type Data =
  | { source: "bank-account"; account: Awaited<ReturnType<typeof getBankAccounts>>[number] }
  | { source: "bucket"; bucket: Bucket };

type StoreState = DialogState & {
  data: Data | null;
  setData: (data: Data) => void;
};

export const useLogAllocationDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  data: null,
  setData: (data) => set({ data }),
}));

export function LogAllocationDialog() {
  const { isOpen, closeDialog, toggleDialog, data } = useLogAllocationDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      data: state.data,
    })),
  );

  const mutation = useLogAllocationMutation();

  const defaultValues: z.input<typeof logAllocationSchema> = {
    bankAccountId: data?.source === "bank-account" ? data.account.id : "",
    bucketId: data?.source === "bucket" ? data.bucket.id : "",
    amount: 0,
    date: new Date(),
    note: "",
  };

  // @todo: handle error
  const { status: bucketsStatus, data: buckets } = useQuery({
    ...bucketsQueryOptions,
    enabled: isOpen && data?.source === "bank-account",
    select: (buckets) =>
      buckets.map((b) => ({
        value: b.id,
        label: b.name,
      })),
  });

  // @todo: handle error
  const { status: bankAccountsStatus, data: bankAccounts } = useQuery({
    ...bankAccountsQueryOption(),
    enabled: isOpen && data?.source === "bucket",
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
      closeDialog();
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

    toggleDialog();
  }

  if (!data) return null;

  const selectedBankAccount =
    data.source === "bank-account"
      ? data.account
      : bankAccounts?.find((a) => a.id === bankAccountId);

  const currencyCode = selectedBankAccount?.currency;
  const currency = currencyCode && isCurrencyCode(currencyCode) ? getCurrency(currencyCode) : null;

  const unallocated = selectedBankAccount
    ? getBankAccountUnallocatedBalance({
        startingBalance: selectedBankAccount.startingBalance,
        transactions: selectedBankAccount.transactions,
        allocations: selectedBankAccount.allocations,
      }).unallocated
    : null;

  const isAmountDisabled = !bankAccountId || !bucketId;

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Allocate Money</DialogTitle>
          <DialogDescription>
            {data.source === "bank-account"
              ? `Move money from ${data.account.name} into a bucket.`
              : `Move money into ${data.bucket.name} from a bank account.`}
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
              {data.source === "bank-account" ? (
                <form.AppField name="bucketId">
                  {(field) => (
                    <field.Select
                      label="Bucket"
                      items={buckets}
                      disabled={bucketsStatus !== "success" || !buckets || buckets.length === 0}
                      placeholder="Select bucket"
                      options={buckets ?? []}
                    />
                  )}
                </form.AppField>
              ) : (
                <form.AppField name="bankAccountId">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                    const id = field.name;
                    const errorId = `${id}-error`;

                    const disabled =
                      bankAccountsStatus !== "success" ||
                      !bankAccounts ||
                      bankAccounts.length === 0;

                    const items = bankAccounts?.map((a) => ({ value: a.id, label: a.name }));

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={id}>Bank Account</FieldLabel>

                        <Select
                          items={items}
                          value={field.state.value}
                          onValueChange={(value) => field.handleChange(value as string)}
                          disabled={disabled}
                        >
                          <SelectTrigger
                            id={id}
                            className="w-full"
                            onBlur={field.handleBlur}
                            aria-invalid={isInvalid ? true : undefined}
                            aria-labelledby={isInvalid ? errorId : undefined}
                          >
                            <SelectValue placeholder="Select bank account" />
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
                                    <div className="flex w-full items-center justify-between gap-3">
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

                        {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                </form.AppField>
              )}
              <form.AppField
                name="amount"
                validators={{
                  onChangeAsyncDebounceMs: 500,
                  onChangeAsync: logAllocationSchema.shape.amount.superRefine(
                    async (value, context) => {
                      const currentBankAccountId = form.getFieldValue("bankAccountId");
                      if (!currentBankAccountId) return;

                      try {
                        const { isValid, message } = await validateLogAllocationAmount({
                          data: {
                            bankAccountId: currentBankAccountId,
                            amount: value,
                          },
                        });

                        if (!isValid) throw new Error(message);
                      } catch (error) {
                        context.addIssue({
                          code: "custom",
                          message: error instanceof Error ? error.message : String(error),
                        });
                      }
                    },
                  ),
                }}
              >
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  const id = field.name;
                  const errorId = `${id}-error`;

                  const isDisabled = isAmountDisabled || !currency;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={id}>Amount</FieldLabel>

                      <InputGroup>
                        <InputGroupAddon>
                          <InputGroupText>{currency?.symbol ?? "—"}</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          type="number"
                          id={field.name}
                          placeholder="0.00"
                          min={0}
                          step={0.01}
                          required
                          disabled={isDisabled}
                          value={field.state.value as string}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          aria-invalid={isInvalid ? true : undefined}
                          aria-labelledby={isInvalid ? errorId : undefined}
                        />
                        <InputGroupAddon align="inline-end">
                          {field.state.meta.isValidating ? (
                            <Spinner />
                          ) : (
                            <InputGroupText>{currency?.code ?? ""}</InputGroupText>
                          )}
                        </InputGroupAddon>
                      </InputGroup>

                      {currency && unallocated !== null && (
                        <FieldDescription>
                          Available:{" "}
                          {formatCurrency(currencyCodec.encode(unallocated), {
                            currency: currency.code,
                          })}
                        </FieldDescription>
                      )}

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
            </FieldGroup>
          </form>
        </div>
        <DialogFooter>
          <form.AppForm>
            <form.Button form={form.formId}>Allocate Money</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
