import { useQuery } from "@tanstack/react-query";
import z from "zod";

import type { Allocation } from "#/db/schema";

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
  amountSchema,
  centsToAmountInput,
  describeAllocationAlreadyWithdrawn,
  describeInsufficientUnallocated,
  exceedsAvailable,
  formatMoney,
} from "#/lib/money";
import { useEditAllocationMutation } from "#/modules/allocations/mutations";
import { allocationQueryOption } from "#/modules/allocations/query-options";
import { editAllocationSchema } from "#/modules/allocations/schemas";
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

export const useEditAllocationDialogStore = createDialogStore<{
  allocationId: Allocation["id"] | null;
}>({ allocationId: null });

export function EditAllocationDialog() {
  const { isOpen, payload, close } = useEditAllocationDialogStore();
  const { allocationId } = payload;

  const {
    status,
    error,
    refetch,
    data: allocation,
  } = useQuery({
    ...allocationQueryOption(allocationId ?? ""),
    enabled: isOpen,
  });

  const mutation = useEditAllocationMutation();

  const defaultValues: z.input<typeof editAllocationSchema> = {
    allocationId: allocationId ?? "",
    amount: centsToAmountInput(allocation?.amount ?? 0),
    date: allocation?.date ?? new Date(),
    note: allocation?.note ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: editAllocationSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      close();
    },
  });

  async function handleOnOpenChange(open: boolean) {
    if (!open && form.state.isDirty) {
      const confirmed = await confirm("Discard editing allocation?", {
        description: "The allocation details you entered will be lost.",
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
          <DialogTitle>Edit Allocation</DialogTitle>
          <DialogDescription>
            Update the amount, date, or note for this allocation.
          </DialogDescription>
        </DialogHeader>
        <div>
          {status === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading allocation"
              description="Fetching allocation details..."
            />
          ) : null}
          {status === "error" && error instanceof NotFoundError ? (
            <StateTemplate
              state="error"
              title="Allocation not found"
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
              title="Could not load allocation"
              description="We weren't able to retrieve this allocation. Please check your connection and try again."
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
                  name="amount"
                  validators={{
                    onChange: ({ value }) => {
                      if (exceedsAvailable(value, allocation.available))
                        return {
                          message: describeInsufficientUnallocated({
                            bankAccount: allocation.bankAccount,
                            availableCents: allocation.available,
                          }),
                        };

                      const amount = amountSchema.safeParse(value);
                      if (amount.success && amount.data < allocation.lowestAllowedAmount)
                        return {
                          message: describeAllocationAlreadyWithdrawn({
                            bucket: allocation.bucket,
                            bankAccount: allocation.bankAccount,
                            withdrawnCents: allocation.lowestAllowedAmount,
                            change: "edit",
                          }),
                        };

                      return undefined;
                    },
                  }}
                >
                  {(field) => (
                    <field.AmountInput
                      label="Amount"
                      min={0.01}
                      step={0.01}
                      required
                      placeholder="0.00"
                      currency={allocation.bankAccount.currency}
                      description={
                        <>
                          Available:{" "}
                          <span className="font-semibold">
                            {formatMoney(allocation.available, allocation.bankAccount.currency)}
                          </span>
                          {allocation.lowestAllowedAmount > 0 ? (
                            <>
                              {" "}
                              · Lowest allowed:{" "}
                              <span className="font-semibold">
                                {formatMoney(
                                  allocation.lowestAllowedAmount,
                                  allocation.bankAccount.currency,
                                )}
                              </span>
                            </>
                          ) : null}
                        </>
                      }
                    />
                  )}
                </form.AppField>
                <form.AppField name="date">
                  {(field) => <field.Datepicker label="Date" />}
                </form.AppField>
                <form.AppField name="note">
                  {(field) => (
                    <field.Textarea label="Note (optional)" placeholder="Add a note..." />
                  )}
                </form.AppField>
              </FieldGroup>
            </form>
          ) : null}
        </div>
        {status === "success" ? (
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId}>Edit Allocation</form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
