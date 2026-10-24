import { useQuery } from "@tanstack/react-query";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import type { Allocation } from "#/db/schema";

import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import {
  createDrawerHandle,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  ResponsiveDrawer,
  type DrawerChangeEventDetails,
} from "#/components/ui/drawer";
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
import { confirm } from "#/stores/use-confirm";

export const editAllocationDrawerHandle = createDrawerHandle<{
  allocationId: Allocation["id"];
}>();

type EditAllocationFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function EditAllocationDrawer() {
  const formControlsRef = useRef<EditAllocationFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard editing allocation?", {
      description: "The allocation details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    editAllocationDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={editAllocationDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          {payload ? (
            <EditAllocationForm allocationId={payload.allocationId} ref={formControlsRef} />
          ) : null}
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}

type EditAllocationFormProps = {
  allocationId: Allocation["id"];
  ref: Ref<EditAllocationFormControls>;
};

function EditAllocationForm({ allocationId, ref }: EditAllocationFormProps) {
  const {
    status,
    error,
    refetch,
    data: allocation,
  } = useQuery(allocationQueryOption(allocationId));

  const mutation = useEditAllocationMutation();

  const defaultValues: z.input<typeof editAllocationSchema> = {
    allocationId,
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
      editAllocationDrawerHandle.close();
    },
  });

  useImperativeHandle(
    ref,
    () => ({ isDirty: () => form.state.isDirty, reset: () => form.reset() }),
    [form],
  );

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Edit Allocation</DrawerTitle>
        <DrawerDescription>Update the amount, date, or note for this allocation.</DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
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
                {(field) => <field.Textarea label="Note (optional)" placeholder="Add a note..." />}
              </form.AppField>
            </FieldGroup>
          </form>
        ) : null}
      </div>
      {status === "success" ? (
        <DrawerFooter className="border-t pt-4">
          <form.AppForm>
            <form.Button form={form.formId}>Edit Allocation</form.Button>
          </form.AppForm>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      ) : null}
    </>
  );
}
