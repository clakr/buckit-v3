import { IconCheck, IconExclamationCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { BankAccount, Bucket } from "#/db/schema";
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

import { useDeleteBucketMutation } from "../mutations";
import { bucketQueryOption } from "../query-options";
import { verifyUserBucketMiddlewareSchema } from "../schemas";

type StoreState = DialogState & {
  bucketId: Bucket["id"] | null;
  setBucketId: (bucketId: Bucket["id"]) => void;
};

export const useDeleteBucketDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  bucketId: null,
  setBucketId: (bucketId) => set({ bucketId }),
}));

export function DeleteBucketDialog() {
  const { isOpen, closeDialog, toggleDialog, bucketId } = useDeleteBucketDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      bucketId: state.bucketId,
    })),
  );

  // @todo: should distinguish if network error or data not found
  const {
    status,
    refetch,
    data: bucket,
  } = useQuery({
    ...bucketQueryOption(bucketId ?? ""),
    enabled: isOpen,
  });

  const mutation = useDeleteBucketMutation();

  const deleteSchema = z.object({
    ...verifyUserBucketMiddlewareSchema.shape,
    name: z.literal(bucket?.name ?? "", {
      error: "Please match the bucket's name",
    }),
  });

  const defaultValues: z.input<typeof deleteSchema> = {
    bucketId: bucket?.id ?? "",
    name: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: deleteSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        mutation.mutateAsync({ data });

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

  const allocations =
    bucket?.allocations.reduce<Record<string, { amount: number; currency: any }>>((acc, a) => {
      if (!a.bankAccount) return acc;

      const name = a.bankAccount?.name;
      const amount = currencyCodec.encode(a.amount);

      if (name in acc) {
        acc[name].amount += amount;
      } else {
        acc[name] = {
          amount,
          currency: a.bankAccount.currency,
        };
      }

      return acc;
    }, {}) ?? {};

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Bucket?</DialogTitle>
          <DialogDescription>
            Permanently delete "{bucket?.name}" and everything logged against it. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <div>
          {status === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading bucket"
              description="Fetching allocations to review before deletion..."
            />
          ) : null}
          {status === "error" ? (
            <StateTemplate
              state="error"
              title="Could not load bucket"
              description="We weren't able to retrieve this bucket's details. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {status === "success" && bucket ? (
            <div className="flex flex-col gap-y-4">
              <ul className="list-inside list-disc text-muted-foreground empty:hidden">
                {bucket.allocations.length ? (
                  <li>
                    {/* @todo: word this better */}
                    Allocations
                    <ul className="ms-4 list-inside list-disc">
                      {Object.entries(allocations).map(([name, { amount, currency }]) => (
                        <li>
                          {name} -{" "}
                          <b className="font-semibold">
                            {formatCurrency(amount, {
                              currency,
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
                          <FieldLabel htmlFor={id}>Type "{bucket.name}" to confirm</FieldLabel>

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
