import z from "zod";
import { useShallow } from "zustand/react/shallow";

import type { Currency } from "#/lib/types";

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
  InputGroupButton,
  InputGroupInput,
} from "#/components/ui/input-group";
import { useAppForm } from "#/integrations/tanstack-form";
import { currencies } from "#/lib/constants";
import { useDialogStore } from "#/stores/use-dialog";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";

import { useAddAccountMutation } from "../mutations";
import { addAccountSchema } from "../schemas";

export function AddAccountDialog() {
  const { isOpen, closeDialog, toggleDialog } = useDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,
    })),
  );

  const mutation = useAddAccountMutation();

  const defaultValues: z.input<typeof addAccountSchema> = {
    name: "",
    currency: "PHP",
    startingBalance: 0,
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onBlurAsync: addAccountSchema,
    },
    onSubmit: async ({ value: data }) => {
      mutation.mutate({ data });

      form.reset();
      closeDialog();
    },
  });

  /* @todo: add guard when closing when dirty */
  function handleOnOpenChange() {
    form.reset();

    toggleDialog();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange} modal={false}>
      {isOpen ? (
        <div
          data-slot="dialog-overlay"
          className="fixed inset-0 isolate z-50 bg-black/80 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Bank Account</DialogTitle>
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
              {/* @todo: implement inputgroup for validation visual indicators */}
              <form.AppField name="name">
                {(field) => <field.Input label="Name" placeholder="Savings Account" required />}
              </form.AppField>
              <Field>
                <FieldLabel>Starting Balance</FieldLabel>

                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <form.AppField name="currency">
                      {(field) => (
                        <Combobox
                          items={currencies}
                          value={field.state.value}
                          onValueChange={(value) => field.handleChange(value?.toString() ?? "")}
                        >
                          <ComboboxTrigger
                            render={
                              <InputGroupButton>
                                <ComboboxValue />
                              </InputGroupButton>
                            }
                          />
                          <ComboboxContent className="w-fit">
                            <ComboboxInput showTrigger={false} placeholder="Search currencies..." />
                            <ComboboxEmpty>No currencies found.</ComboboxEmpty>
                            <ComboboxList>
                              {(currency: Currency) => (
                                <ComboboxItem key={currency.code} value={currency.code}>
                                  <span>{currency.flag}</span>
                                  <span>{currency.code}</span>
                                  <span>{currency.name}</span>
                                  <span className="grow text-end">{currency.symbol}</span>
                                </ComboboxItem>
                              )}
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      )}
                    </form.AppField>
                  </InputGroupAddon>
                  <form.AppField name="startingBalance">
                    {(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
                        <InputGroupInput
                          type="number"
                          placeholder="1,000.00"
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
                <form.Subscribe selector={(state) => state.errorMap.onBlur?.startingBalance}>
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
            <form.Button form={form.formId}>Add Account</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
