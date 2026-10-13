import { IconAlertCircle, IconCalendar } from "@tabler/icons-react";
import { format } from "date-fns";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { Repayment } from "#/db/schema";
import type { DialogState } from "#/lib/types";
import type { getDebt } from "#/modules/debts/functions";

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
import { confirm } from "#/stores/use-confirm";

import { validateEditRepayment } from "../functions";
import { useEditRepaymentMutation } from "../mutations";
import { editRepaymentSchema } from "../schemas";
import { getRepaymentAmount, getRepaymentDate } from "../utils";

type DebtWithRepayments = NonNullable<Awaited<ReturnType<typeof getDebt>>>;

type StoreState = DialogState & {
  debt: DebtWithRepayments | null;
  repaymentId: Repayment["id"] | null;
  setRepayment: (debt: DebtWithRepayments, repaymentId: Repayment["id"]) => void;
};

export const useEditRepaymentDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  debt: null,
  repaymentId: null,
  setRepayment: (debt, repaymentId) => set({ debt, repaymentId }),
}));

export function EditRepaymentDialog() {
  const { isOpen, closeDialog, toggleDialog, debt, repaymentId } = useEditRepaymentDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      debt: state.debt,
      repaymentId: state.repaymentId,
    })),
  );

  const repayment = debt?.repayments.find((r) => r.id === repaymentId);

  const mutation = useEditRepaymentMutation();

  const defaultValues: z.input<typeof editRepaymentSchema> = {
    debtId: debt?.id ?? "",
    repaymentId: repayment?.id ?? "",
    amount: currencyCodec.encode(repayment ? getRepaymentAmount(repayment) : 0),
    date: (repayment ? getRepaymentDate(repayment) : undefined) ?? new Date(),
    note: repayment?.transaction?.note ?? repayment?.note ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: editRepaymentSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          const { isValid, message } = await validateEditRepayment({ data: value });

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
      const confirmed = await confirm("Discard editing repayment?", {
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

  if (!debt || !repayment) return null;

  const bankAccount = repayment.transaction?.bankAccount ?? null;
  const currency = isCurrencyCode(debt.currency) ? getCurrency(debt.currency) : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Repayment</DialogTitle>
          <DialogDescription>
            {bankAccount
              ? `Changes apply to the linked "${bankAccount.name}" transaction for "${debt.name}".`
              : `Update this off-app repayment against "${debt.name}".`}
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
              <form.AppField name="amount">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  const id = field.name;
                  const errorId = `${id}-error`;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={id}>Amount</FieldLabel>

                      <InputGroup>
                        <InputGroupAddon>
                          <InputGroupText>{currency?.symbol}</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          type="number"
                          id={id}
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
                          <InputGroupText>{debt.currency}</InputGroupText>
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

                      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
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
                      <AlertTitle>Edit Repayment failed</AlertTitle>
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
            <form.Button form={form.formId}>Edit Repayment</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
