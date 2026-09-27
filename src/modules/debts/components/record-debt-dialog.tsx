import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { DialogState } from "#/lib/types";

import { CurrencyCombobox } from "#/components/currency-combobox";
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
          {/* @todo: description */}
          <DialogDescription>Create a bucket to organize your money.</DialogDescription>
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
              <form.AppField name="name">
                {(field) => <field.Input label="Counterparty Name" placeholder="John" required />}
              </form.AppField>
              <form.AppField name="direction">
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
              <Field>
                <FieldLabel htmlFor="amount">Amount</FieldLabel>

                <InputGroup>
                  <InputGroupAddon>
                    <form.AppField name="currency">
                      {(field) => (
                        <CurrencyCombobox
                          value={field.state.value}
                          onValueChange={(value) => field.handleChange(value?.toString() ?? "")}
                        />
                      )}
                    </form.AppField>
                  </InputGroupAddon>
                  <form.AppField name="amount">
                    {(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
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
                      );
                    }}
                  </form.AppField>
                </InputGroup>
                <form.Subscribe selector={(state) => state.errorMap.onChange?.amount}>
                  {(amountErrors) => <FieldError id="amount-error" errors={amountErrors} />}
                </form.Subscribe>
              </Field>
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
