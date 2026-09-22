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
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";
import { useDeleteBankAccountMutation } from "#/modules/bank-accounts/mutations";
import { bankAccountQueryOption } from "#/modules/bank-accounts/query-options";
import { verifyUserBankAccountMiddlewareSchema } from "#/modules/bank-accounts/schemas";
import { getBankAccountUnallocatedBalance } from "#/modules/bank-accounts/utils";

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

  // @todo: should distinguish if network error or data not found
  const {
    status,
    refetch,
    data: bankAccount,
  } = useQuery({
    ...bankAccountQueryOption(bankAccountId ?? ""),
    enabled: isOpen,
  });

  const mutation = useDeleteBankAccountMutation();

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

  const totalTransactions = bankAccount?.transactions.length ?? 0;
  const { balance } = getBankAccountUnallocatedBalance({
    startingBalance: bankAccount?.startingBalance ?? 0,
    transactions: bankAccount?.transactions ?? [],
    allocations: bankAccount?.allocations ?? [],
  });

  const totalAllocations = bankAccount?.allocations.length ?? 0;
  const allocations =
    bankAccount?.allocations.reduce<Record<string, number>>((acc, a) => {
      if (!a.bucket) return acc;

      const name = a.bucket.name;
      const amount = currencyCodec.encode(a.amount);

      if (name in acc) {
        acc[name] += amount;
      } else {
        acc[name] = amount;
      }

      return acc;
    }, {}) ?? {};

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Account?</DialogTitle>
          <DialogDescription>
            Permanently delete "{bankAccount?.name}" and everything logged against it. This cannot
            be undone.
          </DialogDescription>
        </DialogHeader>
        <div>
          {status === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading account"
              description="Fetching transactions and allocations to review before deletion..."
            />
          ) : null}
          {status === "error" ? (
            <StateTemplate
              state="error"
              title="Could not load account"
              description="We weren't able to retrieve this account's details. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {status === "success" && bankAccount ? (
            <div className="flex flex-col gap-y-4">
              <ul className="list-inside list-disc text-muted-foreground empty:hidden">
                {totalTransactions ? (
                  <li>
                    <b>{totalTransactions}</b> transactions totaling{" "}
                    <b>
                      {formatCurrency(currencyCodec.encode(balance), {
                        currency: bankAccount.currency,
                      })}
                    </b>{" "}
                    will be permanently deleted.
                  </li>
                ) : null}
                {totalAllocations ? (
                  <li>
                    <b>{totalAllocations}</b> allocations will be permanently deleted, reducing the
                    balance of these buckets:
                    <ul className="ms-4 list-inside list-disc">
                      {Object.entries(allocations).map(([name, amount]) => (
                        <li key={name}>
                          {name} -{" "}
                          <b className="font-semibold">
                            {formatCurrency(amount, {
                              currency: bankAccount.currency,
                            })}
                          </b>
                        </li>
                      ))}
                    </ul>
                  </li>
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
                  <form.AppField name="name">
                    {(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                      const id = field.name;
                      const errorId = `${id}-error`;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={id}>Type "{bankAccount.name}" to confirm</FieldLabel>

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
