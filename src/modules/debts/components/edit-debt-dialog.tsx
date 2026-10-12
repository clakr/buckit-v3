import { IconCalendar, IconFileDescription, IconLock } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { Debt } from "#/db/schema";
import type { DialogState } from "#/lib/types";

import { StateTemplate } from "#/components/state-template";
import { Badge } from "#/components/ui/badge";
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
import { useAppForm } from "#/integrations/tanstack-form";
import { currencyCodec } from "#/lib/codecs";
import { getCurrency, isCurrencyCode } from "#/lib/utils";
import { useEditDebtMutation } from "#/modules/debts/mutations";
import { debtQueryOption } from "#/modules/debts/query-options";
import { editDebtSchema } from "#/modules/debts/schemas";
import { confirm } from "#/stores/use-confirm";

type StoreState = DialogState & {
  debtId: Debt["id"] | null;
  setDebtId: (debtId: Debt["id"]) => void;
};

export const useEditDebtDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  debtId: null,
  setDebtId: (debtId) => set({ debtId }),
}));

export function EditDebtDialog() {
  const { isOpen, closeDialog, toggleDialog, debtId } = useEditDebtDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      debtId: state.debtId,
    })),
  );

  const {
    status,
    refetch,
    data: debt,
  } = useQuery({
    ...debtQueryOption(debtId ?? ""),
    enabled: isOpen,
  });

  const mutation = useEditDebtMutation();

  const isAmountLocked = debt?.direction === "receivable";

  const defaultValues: z.input<typeof editDebtSchema> = {
    debtId: debt?.id ?? "",
    name: debt?.name ?? "",
    amount: currencyCodec.encode(debt?.amount ?? 0),
    date: debt?.date ?? new Date(),
    note: debt?.note ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: editDebtSchema,
    },
    onSubmit: async ({ value }) => {
      // A receivable's amount is locked, so it's never sent — the server rejects it.
      const data = isAmountLocked ? { ...value, amount: undefined } : value;

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
      const confirmed = await confirm("Discard editing debt?", {
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
          <DialogTitle className="flex items-center gap-x-2">
            Edit Debt
            {debt ? (
              <Badge
                variant={debt.direction === "receivable" ? "default" : "secondary"}
                className="capitalize"
              >
                {debt.direction}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>Update the details of this debt.</DialogDescription>
        </DialogHeader>
        <div>
          {status === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading debt"
              description="Fetching debt details..."
            />
          ) : null}
          {status === "error" ? (
            <StateTemplate
              state="error"
              title="Could not load debt"
              description="We weren't able to retrieve this debt. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {status === "success" && debt ? (
            <form
              id={form.formId}
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
              <FieldGroup>
                <form.AppField name="name">
                  {(field) => <field.Input label="Counterparty Name" maxLength={100} required />}
                </form.AppField>
                <form.AppField name="amount">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                    const id = field.name;
                    const errorId = `${id}-error`;
                    const descriptionId = `${id}-description`;

                    const currency = isCurrencyCode(debt.currency)
                      ? getCurrency(debt.currency)
                      : undefined;

                    return (
                      <Field data-invalid={isInvalid} data-disabled={isAmountLocked}>
                        <FieldLabel htmlFor={id}>Amount</FieldLabel>

                        <InputGroup>
                          <InputGroupAddon>
                            {isAmountLocked ? (
                              <IconLock />
                            ) : (
                              <InputGroupText>{currency?.symbol}</InputGroupText>
                            )}
                          </InputGroupAddon>
                          <InputGroupInput
                            type="number"
                            id={id}
                            placeholder="0.00"
                            min={0.01}
                            step={0.01}
                            required
                            disabled={isAmountLocked}
                            value={field.state.value as string}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={isInvalid ? true : undefined}
                            aria-labelledby={isInvalid ? errorId : undefined}
                            aria-describedby={isAmountLocked ? descriptionId : undefined}
                          />
                          <InputGroupAddon align="inline-end">
                            <InputGroupText>{debt.currency}</InputGroupText>
                          </InputGroupAddon>
                        </InputGroup>

                        {isAmountLocked ? (
                          <FieldDescription id={descriptionId}>
                            A receivable's amount is locked once recorded. To correct it, delete
                            this debt and record it again.
                          </FieldDescription>
                        ) : null}
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
                  {(field) => (
                    <field.Textarea label="Note (optional)" placeholder="Add a note..." />
                  )}
                </form.AppField>
              </FieldGroup>
            </form>
          ) : null}
          {status === "success" && !debt ? (
            <StateTemplate
              state="empty"
              title="Debt not found"
              description="This debt doesn't exist or may have been deleted."
              icon={<IconFileDescription />}
            />
          ) : null}
        </div>
        {status === "success" && debt ? (
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId}>Edit Debt</form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
