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
import { FieldGroup } from "#/components/ui/field";
import { useAppForm } from "#/integrations/tanstack-form";
import { NotFoundError } from "#/lib/errors";
import { refineNameAvailability } from "#/lib/name-availability";
import { validateBankAccountName } from "#/modules/bank-accounts/functions";
import { useEditBankAccountMutation } from "#/modules/bank-accounts/mutations";
import { bankAccountQueryOption } from "#/modules/bank-accounts/query-options";
import { editBankAccountSchema } from "#/modules/bank-accounts/schemas";
import { confirm } from "#/stores/use-confirm";

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

  const {
    status,
    error,
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
      onChange: editBankAccountSchema,
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
          {status === "error" && error instanceof NotFoundError ? (
            <StateTemplate
              state="error"
              title="Account not found"
              description={error.message}
              content={
                <Button variant="secondary" onClick={closeDialog}>
                  Close
                </Button>
              }
            />
          ) : null}
          {status === "error" && !(error instanceof NotFoundError) ? (
            <StateTemplate
              state="error"
              title="Could not load account"
              description="We weren't able to retrieve this account. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {status === "success" ? (
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
                    onChangeAsync: editBankAccountSchema.shape.name.superRefine(
                      refineNameAvailability((name) =>
                        validateBankAccountName({ data: { bankAccountId: bankAccount.id, name } }),
                      ),
                    ),
                  }}
                >
                  {(field) => <field.ValidatedInput label="Name" maxLength={100} />}
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
