import { IconCalendar } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { BankAccount } from "#/db/schema";
import type { DialogState } from "#/lib/types";

import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import {
  Dialog,
  DialogContent,
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
import { useLogAllocationMutation } from "#/modules/allocations/mutations";
import { logAllocationSchema } from "#/modules/allocations/schema";
import { bucketsQueryOptions } from "#/modules/buckets/query-options";
import { confirm } from "#/stores/use-confirm";

import { validateAllocationAmount } from "../functions";

type StoreState = DialogState & {
  account: BankAccount | null;
  setAccount: (account: BankAccount) => void;
};

export const useLogAllocationDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  account: null,
  setAccount: (account) => set({ account }),
}));

export function LogAllocationDialog() {
  const { isOpen, closeDialog, toggleDialog, account } = useLogAllocationDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      account: state.account,
    })),
  );

  const mutation = useLogAllocationMutation();

  const defaultValues: z.input<typeof logAllocationSchema> = {
    bankAccountId: account?.id ?? "",
    bucketId: "",
    amount: 0,
    date: new Date(),
    note: "",
  };

  const {
    isLoading,
    isError, // @todo: handle error
    data: buckets,
  } = useQuery({
    ...bucketsQueryOptions,
    enabled: isOpen,
    select: (buckets) =>
      buckets.map((b) => ({
        value: b.id,
        label: b.name,
      })),
  });

  const form = useAppForm({
    defaultValues,
    validators: {
      onBlur: logAllocationSchema,
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
      const confirmed = await confirm("Discard new allocation?", {
        description: "The allocation details you entered will be lost.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
      });

      if (!confirmed) return;
    }

    form.reset();

    toggleDialog();
  }

  if (!account) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Allocate Money</DialogTitle>
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
                        disabled={isLoading || isError}
                      >
                        <SelectTrigger
                          id={id}
                          aria-invalid={isInvalid ? true : undefined}
                          aria-labelledby={isInvalid ? errorId : undefined}
                          className="w-full"
                          icon={isLoading ? <Spinner /> : undefined}
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
              <form.AppField
                name="amount"
                validators={{
                  onChangeAsyncDebounceMs: 500,
                  onChangeAsync: z.coerce.number().superRefine(async (data, context) => {
                    try {
                      const { isValid, unallocated } = await validateAllocationAmount({
                        data: {
                          bankAccountId: account.id,
                          amount: currencyCodec.decode(data),
                        },
                      });

                      if (!isValid) {
                        context.addIssue({
                          code: "custom",
                          message: `Insufficient unallocated balance in ${account.name}. Available: ${formatCurrency(
                            currencyCodec.encode(unallocated),
                            {
                              currency: account.currency,
                            },
                          )}.`,
                        });
                      }
                    } catch (error) {
                      context.addIssue({
                        code: "custom",
                        message: error instanceof Error ? error.message : String(error),
                      });
                    }
                  }),
                }}
              >
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  const id = field.name;
                  const errorId = `${id}-error`;

                  const accountCurrency = account.currency;

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
                          aria-labelledby={isInvalid ? "startingBalance-error" : undefined}
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
