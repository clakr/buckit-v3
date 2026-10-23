import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import type { Debt } from "#/db/schema";

import { StateTemplate } from "#/components/state-template";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  createDrawerHandle,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  type DrawerChangeEventDetails,
} from "#/components/ui/drawer";
import { FieldGroup } from "#/components/ui/field";
import { useIsMobile } from "#/hooks/use-mobile";
import { useAppForm } from "#/integrations/tanstack-form";
import { NotFoundError } from "#/lib/errors";
import { centsToAmountInput } from "#/lib/money";
import { useEditDebtMutation } from "#/modules/debts/mutations";
import { debtQueryOption } from "#/modules/debts/query-options";
import { editDebtFormSchema } from "#/modules/debts/schemas";
import { confirm } from "#/stores/use-confirm";

export const editDebtDrawerHandle = createDrawerHandle<{ debtId: Debt["id"] }>();

type EditDebtFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function EditDebtDrawer() {
  const isMobile = useIsMobile();

  const formControlsRef = useRef<EditDebtFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard editing debt?", {
      description: "The debt details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    editDebtDrawerHandle.close();
  }

  return (
    <Drawer
      handle={editDebtDrawerHandle}
      onOpenChange={handleOnOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? "down" : "right"}
    >
      {({ payload }) => (
        <DrawerContent>
          {payload ? <EditDebtForm debtId={payload.debtId} ref={formControlsRef} /> : null}
        </DrawerContent>
      )}
    </Drawer>
  );
}

type EditDebtFormProps = {
  debtId: Debt["id"];
  ref: Ref<EditDebtFormControls>;
};

function EditDebtForm({ debtId, ref }: EditDebtFormProps) {
  const router = useRouter();

  const { status, error, refetch, data: debt } = useQuery(debtQueryOption(debtId));

  const mutation = useEditDebtMutation();

  const isAmountLocked = debt?.direction === "receivable";

  const defaultValues: z.input<typeof editDebtFormSchema> = {
    debtId: debt?.id ?? "",
    name: debt?.name ?? "",
    amount: centsToAmountInput(debt?.amount ?? 0),
    date: debt?.date ?? new Date(),
    note: debt?.note ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: editDebtFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (!debt) return;

      const { amount, ...details } = value;
      const data =
        debt.direction === "receivable"
          ? { ...details, direction: debt.direction }
          : { ...details, direction: debt.direction, amount };

      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      router.invalidate();
      form.reset();
      editDebtDrawerHandle.close();
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
        <DrawerTitle className="flex items-center gap-x-2">
          Edit Debt
          {debt ? (
            <Badge
              variant={debt.direction === "receivable" ? "default" : "secondary"}
              className="capitalize"
            >
              {debt.direction}
            </Badge>
          ) : null}
        </DrawerTitle>
        <DrawerDescription>Update the details of this debt.</DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {status === "pending" ? (
          <StateTemplate
            state="loading"
            title="Loading debt"
            description="Fetching debt details..."
          />
        ) : null}
        {status === "error" && error instanceof NotFoundError ? (
          <StateTemplate
            state="error"
            title="Debt not found"
            description={error.message}
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
          />
        ) : null}
        {status === "error" && !(error instanceof NotFoundError) ? (
          <StateTemplate
            state="error"
            title="Could not load debt"
            description="We weren't able to retrieve this debt. Please check your connection and try again."
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
              <form.AppField name="name">
                {(field) => <field.Input label="Counterparty Name" maxLength={100} required />}
              </form.AppField>
              <form.AppField name="amount">
                {(field) => (
                  <field.AmountInput
                    label="Amount"
                    min={0.01}
                    step={0.01}
                    required
                    placeholder="0.00"
                    currency={debt.currency}
                    locked={isAmountLocked}
                    description={
                      isAmountLocked
                        ? "A receivable's amount is locked once recorded. To correct it, delete this debt and record it again."
                        : undefined
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
            <form.Button form={form.formId}>Edit Debt</form.Button>
          </form.AppForm>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      ) : null}
    </>
  );
}
