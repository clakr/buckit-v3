import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import z from "zod";

import { Button } from "#/components/ui/button";
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
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { Switch } from "#/components/ui/switch";
import { useAppForm } from "#/integrations/tanstack-form";
import { refineNameAvailability } from "#/lib/name-availability";
import { validateBucketName } from "#/modules/buckets/functions";
import { useSetUpBucketMutation } from "#/modules/buckets/mutations";
import { setUpBucketSchema } from "#/modules/buckets/schemas";
import { GoalTargetFields } from "#/modules/goals/components/goal-target-fields";
import { goalCurrenciesQueryOptions } from "#/modules/goals/query-options";
import { setUpBucketWithGoalSchema } from "#/modules/goals/schemas";
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

export const useSetUpBucketDialogStore = createDialogStore();

export function SetUpBucketDialog() {
  const { isOpen, close } = useSetUpBucketDialogStore();

  const mutation = useSetUpBucketMutation();

  const {
    status: currenciesStatus,
    refetch: refetchCurrencies,
    data: currencies,
  } = useQuery({ ...goalCurrenciesQueryOptions, enabled: isOpen });

  const defaultValues: z.input<typeof setUpBucketWithGoalSchema> = {
    name: "",
    goal: null,
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: setUpBucketWithGoalSchema,
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

  const hasGoal = useSelector(form.store, (state) => state.values.goal !== null);

  function handleGoalToggle(checked: boolean) {
    form.setFieldValue(
      "goal",
      checked && currencies?.[0]
        ? { targetAmount: 0, currency: currencies[0], targetDate: null }
        : null,
    );
  }

  const goalToggleHint =
    currenciesStatus === "pending"
      ? "Fetching your bank account currencies..."
      : currenciesStatus === "error"
        ? "We couldn't load your bank account currencies."
        : currencies.length === 0
          ? "Register a bank account first. A goal's currency must be one your accounts use."
          : "Track saving toward a target amount, optionally by a date.";

  const goalSwitchId = `${form.formId}-has-goal`;

  async function handleOnOpenChange(open: boolean) {
    if (!open && form.state.isDirty) {
      const confirmed = await confirm("Discard new bucket?", {
        description: "The bucket details you entered will be lost.",
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
          <DialogTitle>Set Up Bucket</DialogTitle>
          <DialogDescription>Create a bucket to organize your money.</DialogDescription>
        </DialogHeader>
        <div>
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
                name="name"
                validators={{
                  onChangeAsyncDebounceMs: 500,
                  onChangeAsync: setUpBucketSchema.shape.name.superRefine(
                    refineNameAvailability((name) => validateBucketName({ data: { name } })),
                  ),
                }}
              >
                {(field) => <field.ValidatedInput label="Name" maxLength={100} />}
              </form.AppField>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor={goalSwitchId}>Set a Goal</FieldLabel>
                  <FieldDescription>{goalToggleHint}</FieldDescription>
                  {currenciesStatus === "error" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => refetchCurrencies()}
                    >
                      Retry
                    </Button>
                  ) : null}
                </FieldContent>
                <Switch
                  id={goalSwitchId}
                  checked={hasGoal}
                  disabled={!currencies?.length}
                  onCheckedChange={handleGoalToggle}
                />
              </Field>
              {hasGoal ? (
                <GoalTargetFields form={form} fields="goal" currencies={currencies ?? []} />
              ) : null}
            </FieldGroup>
          </form>
        </div>
        <DialogFooter>
          <form.AppForm>
            <form.Button form={form.formId}>Set Up Bucket</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
