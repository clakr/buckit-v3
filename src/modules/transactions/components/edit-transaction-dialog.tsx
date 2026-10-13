import { IconAlertCircle, IconCalendar, IconFileDescription } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { Transaction } from "#/db/schema";
import type { DialogState } from "#/lib/types";

import { StateTemplate } from "#/components/state-template";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "#/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { useAppForm } from "#/integrations/tanstack-form";
import { currencyCodec } from "#/lib/codecs";
import { getCurrency, isCurrencyCode } from "#/lib/utils";
import { validateEditTransaction } from "#/modules/transactions/functions";
import { useEditTransactionMutation } from "#/modules/transactions/mutations";
import { transactionQueryOption } from "#/modules/transactions/query-options";
import { editTransactionSchema, transactionTypeEnum } from "#/modules/transactions/schemas";
import { confirm } from "#/stores/use-confirm";

type StoreState = DialogState & {
  transactionId: Transaction["id"] | null;
  setTransactionId: (transactionId: Transaction["id"]) => void;
};

export const useEditTransactionDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  transactionId: null,
  setTransactionId: (transactionId) => set({ transactionId }),
}));

export function EditTransactionDialog() {
  const { isOpen, closeDialog, toggleDialog, transactionId } = useEditTransactionDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      transactionId: state.transactionId,
    })),
  );

  const {
    status,
    refetch,
    data: transaction,
  } = useQuery({
    ...transactionQueryOption(transactionId ?? ""),
    enabled: isOpen,
  });

  const mutation = useEditTransactionMutation();

  const defaultValues: z.input<typeof editTransactionSchema> = {
    transactionId: transaction?.id ?? "",
    type: transaction?.type ?? "income",
    amount: currencyCodec.encode(transaction?.amount ?? 0),
    date: transaction?.date ?? new Date(),
    note: transaction?.note ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: editTransactionSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          const { isValid, message } = await validateEditTransaction({
            data: {
              ...value,
              amount: value.amount,
            },
          });

          if (!isValid) return message;

          return undefined;
        } catch (error) {
          console.error(error);

          // A thrown validator would otherwise be an uncaught rejection that crashes the app.
          return "Something went wrong while checking this. Please try again.";
        }
      },
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
      const confirmed = await confirm("Discard editing transaction?", {
        description: "The transaction details you entered will be lost.",
        confirmLabel: "Keep Editing",
        cancelLabel: "Discard",
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
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>Update the details of this transaction.</DialogDescription>
        </DialogHeader>
        <div>
          {status === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading transaction"
              description="Fetching transaction details..."
            />
          ) : null}
          {status === "error" ? (
            <StateTemplate
              state="error"
              title="Could not load transaction"
              description="We weren't able to retrieve this transaction. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {status === "success" && transaction ? (
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
                <form.AppField name="amount">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                    const id = field.name;
                    const errorId = `${id}-error`;

                    const accountCurrency = transaction.bankAccount?.currency ?? "PHP";

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
                  {(field) => (
                    <field.Textarea label="Note (optional)" placeholder="Add a note..." />
                  )}
                </form.AppField>
                <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
                  {(error) =>
                    error ? (
                      <Alert variant="destructive" className="max-w-md">
                        <IconAlertCircle />
                        <AlertTitle>Edit Transaction failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ) : null
                  }
                </form.Subscribe>
              </FieldGroup>
            </form>
          ) : null}
          {/* @todo: handle empty data better */}
          {status === "success" && !transaction ? (
            <StateTemplate
              state="empty"
              title="Transaction not found"
              description="This transaction doesn't exist or may have been deleted."
              icon={<IconFileDescription />}
            />
          ) : null}
        </div>
        {status === "success" && transaction ? (
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId}>Edit Transaction</form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
