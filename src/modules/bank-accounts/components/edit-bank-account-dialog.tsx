import { IconCheck, IconExclamationCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { BankAccount } from "#/db/schema";
import type { DialogState } from "#/lib/types";

import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
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
import { Spinner } from "#/components/ui/spinner";
import { useAppForm } from "#/integrations/tanstack-form";
import { validateEditBankAccountName } from "#/modules/bank-accounts/functions";
import { useEditBankAccountMutation } from "#/modules/bank-accounts/mutations";
import { editBankAccountSchema } from "#/modules/bank-accounts/schemas";
import { confirm } from "#/stores/use-confirm";

import { bankAccountQueryOption } from "../query-options";

type StoreState = DialogState & {
  bankAccountId: BankAccount["id"] | null;
  setBankAccountId: (bankAccountId: BankAccount["id"]) => void;
};

export const useEditBankAccountDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  bankAccountId: null,
  setBankAccountId: (bankAccountId) => set({ bankAccountId }),
}));

export function EditBankAccountDialog() {
  const { isOpen, closeDialog, toggleDialog, bankAccountId } = useEditBankAccountDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      bankAccountId: state.bankAccountId,
    })),
  );

  // @todo: should distinguish if network error or data not found
  const {
    status,
    refetch,
    data: bankAccount,
  } = useQuery({
    ...bankAccountQueryOption(bankAccountId ?? ""),
    enabled: isOpen,
  });

  const mutation = useEditBankAccountMutation();

  const defaultValues: z.input<typeof editBankAccountSchema> = {
    bankAccountId: bankAccountId ?? "",
    name: bankAccount?.name ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onBlur: editBankAccountSchema,
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
      const confirmed = await confirm("Discard editing account?", {
        description: "The account details you entered will be lost.",
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
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>Update your bank account's name.</DialogDescription>
        </DialogHeader>
        <div>
          {status === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading account"
              description="Fetching account details..."
            />
          ) : null}
          {status === "error" ? (
            <StateTemplate
              state="error"
              title="Could not load account"
              description="We weren't able to retrieve this account. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {status === "success" && bankAccount ? (
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
                      if (!data) return;

                      try {
                        const { isValid, message } = await validateEditBankAccountName({
                          data: {
                            bankAccountId: bankAccountId ?? "",
                            name: data,
                          },
                        });

                        if (!isValid) throw new Error(message);
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
              </FieldGroup>
            </form>
          ) : null}
        </div>
        {status === "success" ? (
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId}>Edit Account</form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
