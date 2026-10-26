import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import { CurrencyCombobox } from "#/components/currency-combobox";
import { Button } from "#/components/ui/button";
import {
  createDrawerHandle,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  ResponsiveDrawer,
  type DrawerChangeEventDetails,
} from "#/components/ui/drawer";
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { useAppForm } from "#/integrations/tanstack-form";
import { refineNameAvailability } from "#/lib/name-availability";
import { validateBankAccountName } from "#/modules/bank-accounts/functions";
import { useRegisterBankAccountMutation } from "#/modules/bank-accounts/mutations";
import { registerBankAccountSchema } from "#/modules/bank-accounts/schemas";
import { confirm } from "#/stores/use-confirm";

export type RegisterBankAccountDrawerPayload = { currency: string };

type RegisterBankAccountDrawerHandle = ReturnType<
  typeof createDrawerHandle<RegisterBankAccountDrawerPayload>
>;

export const registerBankAccountDrawerHandle =
  createDrawerHandle<RegisterBankAccountDrawerPayload>();

type RegisterBankAccountFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function RegisterBankAccountDrawer() {
  return <RegisterBankAccountDrawerRoot handle={registerBankAccountDrawerHandle} />;
}

type RegisterBankAccountDrawerRootProps = {
  handle: RegisterBankAccountDrawerHandle;
};

/**
 * Render inside a parent's `DrawerContent` so Base UI nests it, then open it from a
 * `DrawerTrigger` bound to the same `handle` with a `{ currency }` payload.
 */
export function NestedRegisterBankAccountDrawer({ handle }: RegisterBankAccountDrawerRootProps) {
  return <RegisterBankAccountDrawerRoot handle={handle} />;
}

function RegisterBankAccountDrawerRoot({ handle }: RegisterBankAccountDrawerRootProps) {
  const formControlsRef = useRef<RegisterBankAccountFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard new account?", {
      description: "The account details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    handle.close();
  }

  return (
    <ResponsiveDrawer handle={handle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          {payload ? (
            <RegisterBankAccountForm
              currency={payload.currency}
              onRegistered={() => handle.close()}
              ref={formControlsRef}
            />
          ) : null}
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}

type RegisterBankAccountFormProps = {
  currency: string;
  onRegistered: () => void;
  ref: Ref<RegisterBankAccountFormControls>;
};

function RegisterBankAccountForm({ currency, onRegistered, ref }: RegisterBankAccountFormProps) {
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
      onRegistered();
    },
  });

  useImperativeHandle(
    ref,
    () => ({ isDirty: () => form.state.isDirty, reset: () => form.reset() }),
    [form],
  );

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Register Account</DrawerTitle>
        <DrawerDescription>
          Enter the details of your bank account to start tracking.
        </DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
              <FieldLabel htmlFor={`${form.formId}-startingBalance`}>Starting Balance</FieldLabel>

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
                        id={`${form.formId}-startingBalance`}
                        placeholder="0.00"
                        min={0}
                        step={0.01}
                        required
                        value={field.state.value as string}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        aria-invalid={isInvalid ? true : undefined}
                        aria-describedby={
                          isInvalid ? `${form.formId}-startingBalance-error` : undefined
                        }
                      />
                    );
                  }}
                </form.AppField>
              </InputGroup>
              <form.Subscribe
                selector={(state) =>
                  state.fieldMeta.startingBalance?.isTouched
                    ? state.fieldMeta.startingBalance.errors
                    : undefined
                }
              >
                {(startingBalanceErrors) => (
                  <FieldError
                    id={`${form.formId}-startingBalance-error`}
                    errors={startingBalanceErrors}
                  />
                )}
              </form.Subscribe>
            </Field>
          </FieldGroup>
        </form>
      </div>
      <DrawerFooter className="border-t pt-4">
        <form.AppForm>
          <form.Button form={form.formId}>Register Account</form.Button>
        </form.AppForm>
        <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
      </DrawerFooter>
    </>
  );
}
