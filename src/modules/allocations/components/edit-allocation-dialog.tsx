import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { Allocation } from "#/db/schema";
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
import { currencyCodec } from "#/lib/codecs";
import { AppError, NotFoundError } from "#/lib/errors";
import { validateEditAllocationAmount } from "#/modules/allocations/functions";
import { useEditAllocationMutation } from "#/modules/allocations/mutations";
import { allocationQueryOption } from "#/modules/allocations/query-options";
import { editAllocationSchema } from "#/modules/allocations/schemas";
import { confirm } from "#/stores/use-confirm";

type StoreState = DialogState & {
  allocationId: Allocation["id"] | null;
  setAllocationId: (allocationId: Allocation["id"]) => void;
};

export const useEditAllocationDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  allocationId: null,
  setAllocationId: (allocationId) => set({ allocationId }),
}));

export function EditAllocationDialog() {
  const { isOpen, closeDialog, toggleDialog, allocationId } = useEditAllocationDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      allocationId: state.allocationId,
    })),
  );

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
    amount: currencyCodec.encode(allocation?.amount ?? 0),
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
      closeDialog();
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

    toggleDialog();
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
                <Button variant="secondary" onClick={closeDialog}>
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
                    onChangeAsyncDebounceMs: 500,
                    onChangeAsync: editAllocationSchema.shape.amount.superRefine(
                      async (data, context) => {
                        try {
                          const { isValid, message } = await validateEditAllocationAmount({
                            data: { allocationId: allocation.id, amount: data },
                          });

                          if (!isValid) context.addIssue({ code: "custom", message });
                        } catch (error) {
                          console.error(error);

                          context.addIssue({
                            code: "custom",
                            message:
                              error instanceof AppError
                                ? error.message
                                : "Couldn't check this amount. Please try again.",
                          });
                        }
                      },
                    ),
                  }}
                >
                  {(field) => (
                    <field.AmountInput
                      label="Amount"
                      min={0.01}
                      step={0.01}
                      required
                      placeholder="0.00"
                      currency={allocation.bankAccount?.currency}
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
