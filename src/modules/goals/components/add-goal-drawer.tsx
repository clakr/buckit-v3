import { IconBuildingBank } from "@tabler/icons-react";
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
import { registerBankAccountDrawerHandle } from "#/modules/bank-accounts/components/register-bank-account-drawer";
import { bucketQueryOption } from "#/modules/buckets/query-options";
import { GoalTargetFields } from "#/modules/goals/components/goal-target-fields";
import { useAddGoalMutation } from "#/modules/goals/mutations";
import { goalCurrenciesQueryOptions } from "#/modules/goals/query-options";
import { addGoalSchema } from "#/modules/goals/schemas";
import { confirm } from "#/stores/use-confirm";

export const addGoalDrawerHandle = createDrawerHandle<{ bucketId: Bucket["id"] }>();

type AddGoalFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function AddGoalDrawer() {
  const formControlsRef = useRef<AddGoalFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard new goal?", {
      description: "The goal details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    addGoalDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={addGoalDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          {payload ? <AddGoalForm bucketId={payload.bucketId} ref={formControlsRef} /> : null}
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}

type AddGoalFormProps = {
  bucketId: Bucket["id"];
  ref: Ref<AddGoalFormControls>;
};

function AddGoalForm({ bucketId, ref }: AddGoalFormProps) {
  const mutation = useAddGoalMutation();

  const {
    status: bucketStatus,
    refetch: refetchBucket,
    data: bucket,
  } = useQuery(bucketQueryOption(bucketId));

  const {
    status: currenciesStatus,
    refetch: refetchCurrencies,
    data: currencies,
  } = useQuery(goalCurrenciesQueryOptions);

  const defaultValues: z.input<typeof addGoalSchema> = {
    bucketId,
    targetAmount: 0,
    currency: currencies?.[0] ?? "PHP",
    targetDate: null,
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: addGoalSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      addGoalDrawerHandle.close();
    },
  });

  useImperativeHandle(
    ref,
    () => ({ isDirty: () => form.state.isDirty, reset: () => form.reset() }),
    [form],
  );

  function openRegisterBankAccountDrawer() {
    registerBankAccountDrawerHandle.openWithPayload({ currency: "PHP" });
  }

  const loadError =
    bucketStatus === "error"
      ? { noun: "bucket", retry: refetchBucket }
      : currenciesStatus === "error"
        ? { noun: "currencies", retry: refetchCurrencies }
        : null;

  const isReady = bucketStatus === "success" && currenciesStatus === "success";

  const hasCurrencies = Boolean(currencies?.length);

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Add Goal</DrawerTitle>
        {isReady ? (
          <DrawerDescription>
            Set a savings target for {bucket.name}. Only money it holds in the goal's currency
            counts toward it.
          </DrawerDescription>
        ) : null}
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!isReady && !loadError ? (
          <StateTemplate
            state="loading"
            title="Loading"
            description="Fetching your bank account currencies..."
          />
        ) : null}
        {loadError ? (
          <StateTemplate
            state="error"
            title={`Could not load ${loadError.noun}`}
            description={`We weren't able to retrieve the ${loadError.noun}. Please check your connection and try again.`}
            content={<Button onClick={() => loadError.retry()}>Retry</Button>}
          />
        ) : null}
        {isReady && !hasCurrencies ? (
          <StateTemplate
            state="empty"
            icon={<IconBuildingBank />}
            title="No bank accounts yet"
            description="A goal's currency must be one your bank accounts use. Register a bank account first."
            content={<Button onClick={openRegisterBankAccountDrawer}>Register Bank Account</Button>}
          />
        ) : null}
        {isReady && hasCurrencies ? (
          <form
            id={form.formId}
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <GoalTargetFields
                form={form}
                fields={{
                  currency: "currency",
                  targetAmount: "targetAmount",
                  targetDate: "targetDate",
                }}
                currencies={currencies ?? []}
              />
            </FieldGroup>
          </form>
        ) : null}
      </div>
      {isReady && hasCurrencies ? (
        <DrawerFooter className="border-t pt-4">
          <form.AppForm>
            <form.Button form={form.formId}>Add Goal</form.Button>
          </form.AppForm>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      ) : null}
    </>
  );
}
