import { IconCalendar } from "@tabler/icons-react";
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
import { Label } from "#/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { useAppForm } from "#/integrations/tanstack-form";
import { getCurrency, isCurrencyCode } from "#/lib/utils";
import { useLogTransactionMutation } from "#/modules/transactions/mutations";
import { logTransactionSchema, transactionTypeEnum } from "#/modules/transactions/schema";
import { confirm } from "#/stores/use-confirm";

type StoreState = DialogState & {
  account: BankAccount | null;
  setAccount: (account: BankAccount) => void;
};

export const useLogTransactionDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  account: null,
  setAccount: (account) => set({ account }),
}));

export function LogTransactionDialog() {
  const { isOpen, closeDialog, toggleDialog, account } = useLogTransactionDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      account: state.account,
    })),
  );

  const mutation = useLogTransactionMutation();

  const defaultValues: z.input<typeof logTransactionSchema> = {
    bankAccountId: account?.id ?? "",
    type: "income",
    amount: 0,
    date: new Date(),
    note: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onBlur: logTransactionSchema,
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
      const confirmed = await confirm("Discard new transaction?", {
        description: "The transaction details you entered will be lost.",
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
          <DialogTitle>Log Transaction</DialogTitle>
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
              <form.AppField name="type">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  const id = field.name;
                  const errorId = `${id}-error`;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={id}>Type</FieldLabel>

                      <RadioGroup
                        id={id}
                        value={field.state.value}
                        onValueChange={field.handleChange}
                        onBlur={field.handleBlur}
                        aria-invalid={isInvalid ? true : undefined}
                        aria-labelledby={isInvalid ? errorId : undefined}
                      >
                        {Object.keys(transactionTypeEnum.enum).map((type) => (
                          <div key={type} className="flex items-center gap-x-2">
                            <RadioGroupItem value={type} id={type} />
                            <Label htmlFor={type} className="capitalize">
                              {type}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>

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
            </FieldGroup>
          </form>
        </div>
        <DialogFooter>
          <form.AppForm>
            <form.Button form={form.formId}>Log Transaction</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
