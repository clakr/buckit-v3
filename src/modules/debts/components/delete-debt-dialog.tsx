import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import z from "zod";

import type { Debt } from "#/db/schema";

import { StateTemplate } from "#/components/state-template";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { useAppForm } from "#/integrations/tanstack-form";
import { NotFoundError } from "#/lib/errors";
import {
  DebtDeletionSummary,
  getDebtDeletionDescription,
  getLinkedBankAccountsLabel,
} from "#/modules/debts/components/debt-deletion-summary";
import { useDeleteDebtMutation } from "#/modules/debts/mutations";
import { debtDeletionImpactQueryOption } from "#/modules/debts/query-options";
import { deleteDebtSchema } from "#/modules/debts/schemas";
import { describeDeleteTransactionsShortfall } from "#/modules/debts/utils";
import { createDialogStore } from "#/stores/dialog-store";

export const useDeleteDebtDialogStore = createDialogStore<{ debtId: Debt["id"] | null }>({
  debtId: null,
});

export function DeleteDebtDialog() {
  const { isOpen, payload, close } = useDeleteDebtDialogStore();
  const { debtId } = payload;

  const mutation = useDeleteDebtMutation();

  const {
    status,
    error,
    refetch,
    data: impact,
  } = useQuery({
    ...debtDeletionImpactQueryOption(debtId ?? ""),
    enabled: isOpen && !mutation.isPending,
  });

  const deleteSchema = z.object({
    ...deleteDebtSchema.shape,
    name: z.literal(impact?.debt.name ?? "", {
      error: "Doesn't match the name.",
    }),
  });

  const defaultValues: z.input<typeof deleteSchema> = {
    debtId: impact?.debt.id ?? "",
    deleteTransactions: false,
    name: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: deleteSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await mutation.mutateAsync({
          data: { debtId: value.debtId, deleteTransactions: value.deleteTransactions },
        });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      close();
    },
  });

  const deleteTransactions = useSelector(form.store, (state) => state.values.deleteTransactions);

  function handleOnOpenChange() {
    form.reset();
    close();
  }

  const totalLinkedTransactions = impact?.linkedTransactionIds.length ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Debt?</DialogTitle>
          <DialogDescription>
            {status === "success"
              ? getDebtDeletionDescription({ impact, deleteTransactions })
              : "Permanently delete this debt and its repayments. This cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <div>
          {status === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading debt"
              description="Fetching repayments, linked transactions, and their accounts to review before deletion..."
            />
          ) : null}
          {status === "error" && error instanceof NotFoundError ? (
            <StateTemplate
              state="error"
              title="Debt not found"
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
              title="Could not load debt"
              description="We weren't able to retrieve this debt's details. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {status === "success" ? (
            <div className="flex flex-col gap-y-4">
              <DebtDeletionSummary impact={impact} deleteTransactions={deleteTransactions} />
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
                    <form.AppField
                      name="deleteTransactions"
                      validators={{
                        onChange: ({ value }) =>
                          value && impact.shortfall
                            ? { message: describeDeleteTransactionsShortfall(impact.shortfall) }
                            : undefined,
                      }}
                    >
                      {(field) => {
                        const id = field.name;
                        const errorId = `${id}-error`;
                        const isInvalid = !field.state.meta.isValid;

                        return (
                          <Field orientation="horizontal" data-invalid={isInvalid}>
                            <Checkbox
                              id={id}
                              checked={field.state.value}
                              onCheckedChange={(checked) => field.handleChange(checked)}
                              onBlur={field.handleBlur}
                              aria-invalid={isInvalid ? true : undefined}
                              aria-describedby={isInvalid ? errorId : undefined}
                            />
                            <FieldContent>
                              <FieldLabel htmlFor={id}>
                                Also delete the linked{" "}
                                {totalLinkedTransactions === 1 ? "transaction" : "transactions"}
                              </FieldLabel>
                              <FieldDescription>
                                Removes real money movement from{" "}
                                {getLinkedBankAccountsLabel(impact)}. Only check this to undo a debt
                                recorded by mistake.
                              </FieldDescription>
                              {isInvalid && (
                                <FieldError id={errorId} errors={field.state.meta.errors} />
                              )}
                            </FieldContent>
                          </Field>
                        );
                      }}
                    </form.AppField>
                  ) : null}
                  <form.AppField name="name">
                    {(field) => (
                      <field.ValidatedInput
                        label={`Type "${impact.debt.name}" to confirm`}
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
                Delete Debt
              </form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
