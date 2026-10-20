import { useQuery } from "@tanstack/react-query";
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
import {
  BankAccountDeletionSummary,
  getBankAccountDeletionDescription,
} from "#/modules/bank-accounts/components/bank-account-deletion-summary";
import { useDeleteBankAccountMutation } from "#/modules/bank-accounts/mutations";
import { bankAccountDeletionImpactQueryOption } from "#/modules/bank-accounts/query-options";
import { verifyUserBankAccountMiddlewareSchema } from "#/modules/bank-accounts/schemas";
import { createDialogStore } from "#/stores/dialog-store";

export const useDeleteBankAccountDialogStore = createDialogStore<{
  bankAccountId: BankAccount["id"] | null;
}>({ bankAccountId: null });

export function DeleteBankAccountDialog() {
  const { isOpen, payload, close } = useDeleteBankAccountDialogStore();
  const { bankAccountId } = payload;

  const mutation = useDeleteBankAccountMutation();

  const {
    status,
    error,
    refetch,
    data: impact,
  } = useQuery({
    ...bankAccountDeletionImpactQueryOption(bankAccountId ?? ""),
    enabled: isOpen && !mutation.isPending,
  });
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
        close();
      } catch (error) {
        console.error(error);

        return;
      }
    },
  });

  async function handleOnOpenChange() {
    form.reset();
    close();
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
                <Button variant="secondary" onClick={close}>
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
                    {(field) => (
                      <field.ValidatedInput
                        label={`Type "${impact.bankAccount.name}" to confirm`}
                        maxLength={100}
                      />
                    )}
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
