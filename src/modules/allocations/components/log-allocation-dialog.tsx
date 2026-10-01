import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { BankAccount, Bucket } from "#/db/schema";
import type { DialogState } from "#/lib/types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "#/components/ui/input-group";
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
import { getCurrency, isCurrencyCode } from "#/lib/utils";
import {
  baseAllocationDefaultValues,
  BaseAllocationFieldGroup,
  baseAllocationFields,
} from "#/modules/allocations/forms";
import { validateLogAllocationAmount } from "#/modules/allocations/functions";
import { useLogAllocationMutation } from "#/modules/allocations/mutations";
import { logAllocationSchema } from "#/modules/allocations/schemas";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { bucketsQueryOptions } from "#/modules/buckets/query-options";
import { confirm } from "#/stores/use-confirm";

export type Data =
  | { source: "bank-account"; account: BankAccount }
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
    ...baseAllocationDefaultValues,
    bankAccountId: data?.source === "bank-account" ? data.account.id : "",
    bucketId: data?.source === "bucket" ? data.bucket.id : "",
    amount: 0,
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

  const selectedBankAccountId = useSelector(form.store, (state) => state.values.bankAccountId);

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

  const currencyCode =
    data.source === "bank-account"
      ? data.account.currency
      : bankAccounts?.find((a) => a.id === selectedBankAccountId)?.currency;

  const currency = currencyCode && isCurrencyCode(currencyCode) ? getCurrency(currencyCode) : null;

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
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                    const id = field.name;
                    const errorId = `${id}-error`;

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={id}>Bucket</FieldLabel>

                        <Select
                          items={buckets}
                          value={field.state.value}
                          onValueChange={(value) => field.handleChange(value ?? "")}
                          disabled={bucketsStatus !== "success" || !buckets || buckets.length === 0}
                        >
                          <SelectTrigger
                            id={id}
                            aria-invalid={isInvalid ? true : undefined}
                            aria-labelledby={isInvalid ? errorId : undefined}
                            className="w-full"
                            icon={bucketsStatus === "pending" ? <Spinner /> : undefined}
                          >
                            <SelectValue placeholder="Select bucket" />
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger>
                            <SelectGroup>
                              {buckets?.map((b) => (
                                <SelectItem key={b.value} value={b.value}>
                                  {b.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>

                        {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                </form.AppField>
              ) : (
                <form.AppField name="bankAccountId">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                    const id = field.name;
                    const errorId = `${id}-error`;

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={id}>Bank Account</FieldLabel>

                        <Select
                          items={bankAccounts?.map((a) => ({ value: a.id, label: a.name }))}
                          value={field.state.value}
                          onValueChange={(value) => field.handleChange(value ?? "")}
                          disabled={
                            bankAccountsStatus !== "success" ||
                            !bankAccounts ||
                            bankAccounts.length === 0
                          }
                        >
                          <SelectTrigger
                            id={id}
                            aria-invalid={isInvalid ? true : undefined}
                            aria-labelledby={isInvalid ? errorId : undefined}
                            className="w-full"
                            icon={bankAccountsStatus === "pending" ? <Spinner /> : undefined}
                          >
                            <SelectValue placeholder="Select bank account" />
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger>
                            <SelectGroup>
                              {bankAccounts?.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.name}
                                </SelectItem>
                              ))}
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
                      const bankAccountId = form.getFieldValue("bankAccountId");
                      if (!bankAccountId) return;

                      try {
                        const { isValid, message } = await validateLogAllocationAmount({
                          data: {
                            bankAccountId,
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
                          {field.state.meta.isValidating ? (
                            <Spinner />
                          ) : (
                            <InputGroupText>{currency.code}</InputGroupText>
                          )}
                        </InputGroupAddon>
                      </InputGroup>

                      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.AppField>
              <BaseAllocationFieldGroup form={form} fields={baseAllocationFields} />
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
