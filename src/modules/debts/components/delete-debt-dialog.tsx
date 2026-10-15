import { IconAlertCircle } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { Debt } from "#/db/schema";
import type { DialogState } from "#/lib/types";

import { StateTemplate } from "#/components/state-template";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { useAppForm } from "#/integrations/tanstack-form";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import {
  DebtDeletionSummary,
  getDebtDeletionDescription,
} from "#/modules/debts/components/debt-deletion-summary";
import { validateDeleteDebt } from "#/modules/debts/functions";
import { useDeleteDebtMutation } from "#/modules/debts/mutations";
import { debtQueryOption } from "#/modules/debts/query-options";
import { deleteDebtSchema } from "#/modules/debts/schemas";
import { getDebtLinkedTransactionIds } from "#/modules/debts/utils";

type StoreState = DialogState & {
  debtId: Debt["id"] | null;
  setDebtId: (debtId: Debt["id"]) => void;
};

export const useDeleteDebtDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  debtId: null,
  setDebtId: (debtId) => set({ debtId }),
}));

export function DeleteDebtDialog() {
  const { isOpen, closeDialog, toggleDialog, debtId } = useDeleteDebtDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      debtId: state.debtId,
    })),
  );

  const mutation = useDeleteDebtMutation();

  // Disabled while deleting: the global post-mutation invalidation would otherwise refetch the
  // just-deleted record, fail its ownership check, and wait out every retry before the dialog closes.
  // @todo: should distinguish if network error or data not found
  const debtQuery = useQuery({
    ...debtQueryOption(debtId ?? ""),
    enabled: isOpen && !mutation.isPending,
  });
  // The summary needs each linked account's current balance.
  const bankAccountsQuery = useQuery({
    ...bankAccountsQueryOption(),
    enabled: isOpen,
  });

  const debt = debtQuery.data;
  const bankAccounts = bankAccountsQuery.data ?? [];
  const statuses = [debtQuery.status, bankAccountsQuery.status];
  const status = statuses.includes("error")
    ? "error"
    : statuses.includes("pending")
      ? "pending"
      : "success";

  function refetch() {
    if (debtQuery.isError) debtQuery.refetch();
    if (bankAccountsQuery.isError) bankAccountsQuery.refetch();
  }

  const deleteSchema = z.object({
    ...deleteDebtSchema.shape,
    name: z.literal(debt?.name ?? "", {
      error: "Doesn't match the name.",
    }),
  });

  const defaultValues: z.input<typeof deleteSchema> = {
    debtId: debt?.id ?? "",
    deleteTransactions: false,
    name: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: deleteSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          const { isValid, message } = await validateDeleteDebt({
            data: { debtId: value.debtId, deleteTransactions: value.deleteTransactions },
          });

          if (!isValid) return message;

          return undefined;
        } catch (error) {
          console.error(error);

          // A thrown validator would otherwise be an uncaught rejection that crashes the app.
          return "Something went wrong while checking this. Please try again.";
        }
      },
    },
    onSubmit: async ({ value }) => {
      try {
        // `name` is only the typed confirmation — the server's schema is strict.
        await mutation.mutateAsync({
          data: { debtId: value.debtId, deleteTransactions: value.deleteTransactions },
        });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      closeDialog();
    },
  });

  const deleteTransactions = useSelector(form.store, (state) => state.values.deleteTransactions);

  function handleOnOpenChange() {
    form.reset();
    toggleDialog();
  }

  const totalLinkedTransactions = debt ? getDebtLinkedTransactionIds(debt).length : 0;
  const linkedBankAccountNames = Array.from(
    new Set(
      [
        debt?.originatingTransaction?.bankAccount?.name,
        ...(debt?.repayments.map((r) => r.transaction?.bankAccount?.name) ?? []),
      ].filter((name) => name !== undefined),
    ),
  );
  const linkedBankAccountsLabel = linkedBankAccountNames.map((name) => `"${name}"`).join(", ");

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Debt?</DialogTitle>
          <DialogDescription>
            {status === "success" && debt
              ? getDebtDeletionDescription({ debt, deleteTransactions })
              : `Permanently delete the debt with "${debt?.name ?? ""}". This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        <div>
          {status === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading debt"
              description="Fetching repayments, linked transactions, and accounts to review before deletion..."
            />
          ) : null}
          {status === "error" ? (
            <StateTemplate
              state="error"
              title="Could not load debt"
              description="We weren't able to retrieve this debt's details. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {status === "success" && debt ? (
            <div className="flex flex-col gap-y-4">
              <DebtDeletionSummary
                debt={debt}
                bankAccounts={bankAccounts}
                deleteTransactions={deleteTransactions}
              />
              <form
                id={form.formId}
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
              >
                <FieldGroup>
                  {totalLinkedTransactions ? (
                    <form.AppField name="deleteTransactions">
                      {(field) => {
                        const id = field.name;

                        return (
                          <Field orientation="horizontal">
                            <Checkbox
                              id={id}
                              checked={field.state.value}
                              onCheckedChange={(checked) => field.handleChange(checked)}
                              onBlur={field.handleBlur}
                            />
                            <FieldContent>
                              <FieldLabel htmlFor={id}>
                                Also delete the linked{" "}
                                {totalLinkedTransactions === 1 ? "transaction" : "transactions"}
                              </FieldLabel>
                              <FieldDescription>
                                Removes real money movement from {linkedBankAccountsLabel}. Only
                                check this to undo a debt recorded by mistake.
                              </FieldDescription>
                            </FieldContent>
                          </Field>
                        );
                      }}
                    </form.AppField>
                  ) : null}
                  <form.AppField name="name">
                    {(field) => (
                      <field.ValidatedInput
                        label={`Type "${debt.name}" to confirm`}
                        maxLength={100}
                      />
                    )}
                  </form.AppField>
                  <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
                    {(error) =>
                      error ? (
                        <Alert variant="destructive" className="max-w-md">
                          <IconAlertCircle />
                          <AlertTitle>Delete Debt failed</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      ) : null
                    }
                  </form.Subscribe>
                </FieldGroup>
              </form>
            </div>
          ) : null}
        </div>
        {status === "success" ? (
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId} variant="destructive">
                Delete Debt
              </form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
