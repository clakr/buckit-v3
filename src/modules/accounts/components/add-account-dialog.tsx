import { IconCheck, IconExclamationCircle } from "@tabler/icons-react";
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
import { Spinner } from "#/components/ui/spinner";
import { useAppForm } from "#/integrations/tanstack-form";
import { currencies } from "#/lib/constants";
import { createDialogStore } from "#/stores/use-dialog";
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

import { validateBankAccountName } from "../functions";
import { useAddAccountMutation } from "../mutations";
import { addAccountSchema } from "../schemas";

export const useAddAccountDialogStore = createDialogStore();

export function AddAccountDialog() {
  const { isOpen, closeDialog, toggleDialog } = useAddAccountDialogStore(
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
      onBlur: addAccountSchema,
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

  /* @todo: add guard when closing when dirty */
  function handleOnOpenChange() {
    form.reset();

    toggleDialog();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Account</DialogTitle>
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
                  onChangeAsync: z.string().superRefine(async (data, context) => {
                    try {
                      const hasNoExistingBankAccounts = await validateBankAccountName({
                        data,
                      });

                      if (!hasNoExistingBankAccounts) {
                        context.addIssue({
                          code: "custom",
                          message: "An account with this name already exists.",
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

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={id}>Name</FieldLabel>

                      <InputGroup>
                        <InputGroupInput
                          type="text"
                          id={id}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          aria-invalid={isInvalid ? true : undefined}
                          aria-labelledby={isInvalid ? errorId : undefined}
                          maxLength={100}
                        />
                        {field.state.meta.isTouched ? (
                          <InputGroupAddon align="inline-end">
                            {field.state.meta.isValidating ? (
                              <Spinner />
                            ) : field.state.meta.isValid ? (
                              <IconCheck />
                            ) : (
                              <IconExclamationCircle />
                            )}
                          </InputGroupAddon>
                        ) : null}
                      </InputGroup>
                      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.AppField>
              <Field>
                <FieldLabel htmlFor="startingBalance">Starting Balance</FieldLabel>

                <InputGroup>
                  <InputGroupAddon>
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
                          id={field.name}
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
