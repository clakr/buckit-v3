import { useQuery } from "@tanstack/react-query";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import type { Bucket } from "#/db/schema";

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
import { centsToAmountInput } from "#/lib/money";
import { GoalTargetDateField } from "#/modules/goals/components/goal-target-fields";
import { useEditGoalMutation } from "#/modules/goals/mutations";
import { bucketGoalQueryOption } from "#/modules/goals/query-options";
import { editGoalSchema } from "#/modules/goals/schemas";
import { confirm } from "#/stores/use-confirm";

export const editGoalDrawerHandle = createDrawerHandle<{ bucketId: Bucket["id"] }>();

type EditGoalFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function EditGoalDrawer() {
  const formControlsRef = useRef<EditGoalFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard editing goal?", {
      description: "The goal details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    editGoalDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={editGoalDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          {payload ? <EditGoalForm bucketId={payload.bucketId} ref={formControlsRef} /> : null}
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}

type EditGoalFormProps = {
  bucketId: Bucket["id"];
  ref: Ref<EditGoalFormControls>;
};

function EditGoalForm({ bucketId, ref }: EditGoalFormProps) {
  const { status, refetch, data: goal } = useQuery(bucketGoalQueryOption(bucketId));

  const mutation = useEditGoalMutation();

  const defaultValues: z.input<typeof editGoalSchema> = {
    goalId: goal?.id ?? "",
    targetAmount: centsToAmountInput(goal?.targetAmount ?? 0),
    targetDate: goal?.targetDate ?? null,
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: editGoalSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      editGoalDrawerHandle.close();
    },
  });

  useImperativeHandle(
    ref,
    () => ({ isDirty: () => form.state.isDirty, reset: () => form.reset() }),
    [form],
  );

  const isReady = status === "success" && goal !== null;

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Edit Goal</DrawerTitle>
        <DrawerDescription>
          {isReady
            ? `Update the target amount or date. The currency stays ${goal.currency}; to change it, remove this goal and add a new one.`
            : "Update the target amount or date."}
        </DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {status === "pending" ? (
          <StateTemplate
            state="loading"
            title="Loading goal"
            description="Fetching goal details..."
          />
        ) : null}
        {status === "success" && goal === null ? (
          <StateTemplate
            state="error"
            title="Goal not found"
            description="This goal doesn't exist or may have been removed."
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
          />
        ) : null}
        {status === "error" ? (
          <StateTemplate
            state="error"
            title="Could not load goal"
            description="We weren't able to retrieve this goal. Please check your connection and try again."
            content={<Button onClick={() => refetch()}>Retry</Button>}
          />
        ) : null}
        {isReady ? (
          <form
            id={form.formId}
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField name="targetAmount">
                {(field) => (
                  <field.AmountInput
                    label="Target Amount"
                    min={0.01}
                    step={0.01}
                    required
                    placeholder="0.00"
                    currency={goal.currency}
                  />
                )}
              </form.AppField>
              <form.AppField name="targetDate">{() => <GoalTargetDateField />}</form.AppField>
            </FieldGroup>
          </form>
        ) : null}
      </div>
      {isReady ? (
        <DrawerFooter className="border-t pt-4">
          <form.AppForm>
            <form.Button form={form.formId}>Edit Goal</form.Button>
          </form.AppForm>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      ) : null}
    </>
  );
}
