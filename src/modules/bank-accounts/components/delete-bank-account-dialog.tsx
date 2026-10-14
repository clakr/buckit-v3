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
import { NotFoundError } from "#/lib/errors";
import {
  BankAccountDeletionSummary,
  getBankAccountDeletionDescription,
} from "#/modules/bank-accounts/components/bank-account-deletion-summary";
import { useDeleteBankAccountMutation } from "#/modules/bank-accounts/mutations";
import { bankAccountDeletionImpactQueryOption } from "#/modules/bank-accounts/query-options";
import { verifyUserBankAccountMiddlewareSchema } from "#/modules/bank-accounts/schemas";

type StoreState = DialogState & {
  bankAccountId: BankAccount["id"] | null;
  setBankAccountId: (bankAccountId: BankAccount["id"]) => void;
};

export const useDeleteBankAccountDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  bankAccountId: null,
  setBankAccountId: (bankAccountId) => set({ bankAccountId }),
}));

export function DeleteBankAccountDialog() {
  const { isOpen, closeDialog, toggleDialog, bankAccountId } = useDeleteBankAccountDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      bankAccountId: state.bankAccountId,
    })),
  );

  const mutation = useDeleteBankAccountMutation();

  // Disabled while deleting: the global post-mutation invalidation would otherwise refetch the
  // just-deleted record and flash "Account not found" before the dialog closes.
  const {
    status,
    error,
    refetch,
    data: impact,
  } = useQuery({
    ...bankAccountDeletionImpactQueryOption(bankAccountId ?? ""),
    enabled: isOpen && !mutation.isPending,
  });
  // Already gone, e.g. deleted in another tab: retrying can't bring it back.
  const notFoundError = error instanceof NotFoundError ? error : null;
  const bankAccount = impact?.bankAccount;

  const deleteSchema = z.object({
    ...verifyUserBankAccountMiddlewareSchema.shape,
    name: z.literal(bankAccount?.name ?? "", {
      error: "Doesn't match the account name.",
    }),
  });

  const defaultValues: z.input<typeof deleteSchema> = {
    bankAccountId: bankAccount?.id ?? "",
    name: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: deleteSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });

        form.reset();
        closeDialog();
      } catch (error) {
        console.error(error);

        return;
      }
    },
  });

  async function handleOnOpenChange() {
    form.reset();
    toggleDialog();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Account?</DialogTitle>
          <DialogDescription>
            {status === "success"
              ? getBankAccountDeletionDescription({ impact })
              : "Permanently delete this account and everything logged against it. This cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <div>
          {status === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading account"
              description="Fetching transactions, allocations, buckets, and debts to review before deletion..."
            />
          ) : null}
          {status === "error" && notFoundError ? (
            <StateTemplate
              state="error"
              title="Account not found"
              description={notFoundError.message}
              content={
                <Button variant="secondary" onClick={closeDialog}>
                  Close
                </Button>
              }
            />
          ) : null}
          {status === "error" && !notFoundError ? (
            <StateTemplate
              state="error"
              title="Could not load account"
              description="We weren't able to retrieve this account's details. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {status === "success" ? (
            <div className="flex flex-col gap-y-4">
              <BankAccountDeletionSummary impact={impact} />
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
                    {(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                      const id = field.name;
                      const errorId = `${id}-error`;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={id}>
                            Type "{impact.bankAccount.name}" to confirm
                          </FieldLabel>

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
                          {isInvalid && (
                            <FieldError id={errorId} errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.AppField>
                </FieldGroup>
              </form>
            </div>
          ) : null}
        </div>
        {status === "success" ? (
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId} variant="destructive">
                Delete Account
              </form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
