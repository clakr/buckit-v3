import { IconAlertCircle, IconCheck, IconExclamationCircle } from "@tabler/icons-react";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Spinner } from "#/components/ui/spinner";
import { useAppForm } from "#/integrations/tanstack-form";
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

  // @todo: should distinguish if network error or data not found
  const {
    status,
    refetch,
    data: debt,
  } = useQuery({
    ...debtQueryOption(debtId ?? ""),
    enabled: isOpen,
  });

  const mutation = useDeleteDebtMutation();

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
        const { isValid, message } = await validateDeleteDebt({
          data: { debtId: value.debtId, deleteTransactions: value.deleteTransactions },
        });

        if (!isValid) return message;

        return undefined;
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

  const totalRepayments = debt?.repayments.length ?? 0;
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
            Permanently delete the debt with "{debt?.name}". This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div>
          {status === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading debt"
              description="Fetching repayments and linked transactions to review before deletion..."
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
              <ul className="list-inside list-disc text-muted-foreground empty:hidden">
                {totalRepayments ? (
                  <li>
                    <b>{totalRepayments}</b> {totalRepayments === 1 ? "repayment" : "repayments"}{" "}
                    logged against it will be permanently deleted.
                  </li>
                ) : null}
                {totalLinkedTransactions ? (
                  deleteTransactions ? (
                    <li className="font-medium text-destructive">
                      <b>{totalLinkedTransactions}</b> linked{" "}
                      {totalLinkedTransactions === 1 ? "transaction" : "transactions"} will be
                      permanently deleted from {linkedBankAccountsLabel}, changing{" "}
                      {linkedBankAccountNames.length === 1 ? "its balance" : "their balances"}.
                    </li>
                  ) : (
                    <li>
                      <b>{totalLinkedTransactions}</b> linked{" "}
                      {totalLinkedTransactions === 1 ? "transaction stays" : "transactions stay"} in
                      your account history — no balance changes.
                    </li>
                  )
                ) : null}
              </ul>
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
                    {(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                      const id = field.name;
                      const errorId = `${id}-error`;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={id}>Type "{debt.name}" to confirm</FieldLabel>

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
