import z from "zod";

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
import { refineNameAvailability } from "#/lib/name-availability";
import { validateBankAccountName } from "#/modules/bank-accounts/functions";
import { useRegisterBankAccountMutation } from "#/modules/bank-accounts/mutations";
import { registerBankAccountSchema } from "#/modules/bank-accounts/schemas";
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

export const useRegisterBankAccountDialogStore = createDialogStore<{ currency: string }>({
  currency: "PHP",
});

export function RegisterBankAccountDialog() {
  const { isOpen, payload, close } = useRegisterBankAccountDialogStore();
  const { currency } = payload;

  const mutation = useRegisterBankAccountMutation();

  const defaultValues: z.input<typeof registerBankAccountSchema> = {
    name: "",
    currency,
    startingBalance: 0,
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: registerBankAccountSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      close();
    },
  });

  async function handleOnOpenChange(open: boolean) {
    if (!open && form.state.isDirty) {
      const confirmed = await confirm("Discard new account?", {
        description: "The account details you entered will be lost.",
        confirmLabel: "Keep Editing",
        cancelLabel: "Discard",
        dismissValue: true,
      });

      if (confirmed) return;
    }

    form.reset();

    close();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Account</DialogTitle>
          <DialogDescription>
            Enter the details of your bank account to start tracking.
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
              <form.AppField
                name="name"
                validators={{
                  onChangeAsyncDebounceMs: 500,
                  onChangeAsync: registerBankAccountSchema.shape.name.superRefine(
                    refineNameAvailability((name) => validateBankAccountName({ data: { name } })),
                  ),
                }}
              >
                {(field) => <field.ValidatedInput label="Name" maxLength={100} />}
              </form.AppField>
              <Field>
                <FieldLabel htmlFor="startingBalance">Starting Balance</FieldLabel>

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
                  <form.AppField name="startingBalance">
                    {(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
                        <InputGroupInput
                          type="number"
                          id={field.name}
                          placeholder="0.
                            00"
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
                <form.Subscribe selector={(state) => state.errorMap.onChange?.startingBalance}>
                  {(startingBalanceErrors) => (
                    <FieldError id="startingBalance-error" errors={startingBalanceErrors} />
                  )}
                </form.Subscribe>
              </Field>
            </FieldGroup>
          </form>
        </div>
        <DialogFooter>
          <form.AppForm>
            <form.Button form={form.formId}>Register Account</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
