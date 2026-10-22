import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import z from "zod";

import type { BankAccount } from "#/db/schema";

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
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

export const useEditBankAccountDialogStore = createDialogStore<{
  bankAccountId: BankAccount["id"] | null;
}>({ bankAccountId: null });

export function EditBankAccountDialog() {
  const router = useRouter();
  const { isOpen, payload, close } = useEditBankAccountDialogStore();
  const { bankAccountId } = payload;

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

      router.invalidate();
      form.reset();
      close();
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

    close();
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
                <Button variant="secondary" onClick={close}>
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
                        validateBankAccountName({ data: { excludeId: bankAccount.id, name } }),
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
