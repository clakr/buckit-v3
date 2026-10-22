import { useQuery } from "@tanstack/react-query";
import z from "zod";

import type { Bucket } from "#/db/schema";

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
import { centsToAmountInput } from "#/lib/money";
import { GoalTargetDateField } from "#/modules/goals/components/goal-target-fields";
import { useEditGoalMutation } from "#/modules/goals/mutations";
import { bucketGoalQueryOption } from "#/modules/goals/query-options";
import { editGoalSchema } from "#/modules/goals/schemas";
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

export const useEditGoalDialogStore = createDialogStore<{ bucketId: Bucket["id"] | null }>({
  bucketId: null,
});

export function EditGoalDialog() {
  const { isOpen, payload, close } = useEditGoalDialogStore();
  const { bucketId } = payload;

  const {
    status,
    refetch,
    data: goal,
  } = useQuery({
    ...bucketGoalQueryOption(bucketId ?? ""),
    enabled: isOpen && bucketId !== null,
  });

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
      close();
    },
  });

  async function handleOnOpenChange(open: boolean) {
    if (!open && form.state.isDirty) {
      const confirmed = await confirm("Discard editing goal?", {
        description: "The goal details you entered will be lost.",
        confirmLabel: "Keep Editing",
        cancelLabel: "Discard",
        dismissValue: true,
      });

      if (confirmed) return;
    }

    form.reset();

    close();
  }

  const isReady = status === "success" && goal !== null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
          <DialogDescription>
            {isReady
              ? `Update the target amount or date. The currency stays ${goal.currency}; to change it, remove this goal and add a new one.`
              : "Update the target amount or date."}
          </DialogDescription>
        </DialogHeader>
        <div>
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
              content={
                <Button variant="secondary" onClick={close}>
                  Close
                </Button>
              }
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
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId}>Edit Goal</form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
