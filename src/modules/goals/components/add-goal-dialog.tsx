import { IconBuildingBank } from "@tabler/icons-react";
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
import { registerBankAccountDrawerHandle } from "#/modules/bank-accounts/components/register-bank-account-drawer";
import { bucketQueryOption } from "#/modules/buckets/query-options";
import { GoalTargetFields } from "#/modules/goals/components/goal-target-fields";
import { useAddGoalMutation } from "#/modules/goals/mutations";
import { goalCurrenciesQueryOptions } from "#/modules/goals/query-options";
import { addGoalSchema } from "#/modules/goals/schemas";
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

export const useAddGoalDialogStore = createDialogStore<{ bucketId: Bucket["id"] | null }>({
  bucketId: null,
});

export function AddGoalDialog() {
  const { isOpen, payload, close } = useAddGoalDialogStore();
  const { bucketId } = payload;

  const mutation = useAddGoalMutation();

  const {
    status: bucketStatus,
    refetch: refetchBucket,
    data: bucket,
  } = useQuery({
    ...bucketQueryOption(bucketId ?? ""),
    enabled: isOpen && bucketId !== null,
  });

  const {
    status: currenciesStatus,
    refetch: refetchCurrencies,
    data: currencies,
  } = useQuery({ ...goalCurrenciesQueryOptions, enabled: isOpen });

  // The fallback is never submitted: with no currencies the form isn't shown. The form picks up
  // the first real currency once the query settles, since it updates untouched default values.
  const defaultValues: z.input<typeof addGoalSchema> = {
    bucketId: bucketId ?? "",
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
      close();
    },
  });

  async function handleOnOpenChange(open: boolean) {
    if (!open && form.state.isDirty) {
      const confirmed = await confirm("Discard new goal?", {
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

  function openRegisterBankAccountDrawer() {
    close();
    registerBankAccountDrawerHandle.openWithPayload({ currency: "PHP" });
  }

  if (!bucketId) return null;

  const loadError =
    bucketStatus === "error"
      ? { noun: "bucket", retry: refetchBucket }
      : currenciesStatus === "error"
        ? { noun: "currencies", retry: refetchCurrencies }
        : null;

  const isReady = bucketStatus === "success" && currenciesStatus === "success";

  const hasCurrencies = Boolean(currencies?.length);

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Goal</DialogTitle>
          {isReady ? (
            <DialogDescription>
              Set a savings target for {bucket.name}. Only money it holds in the goal's currency
              counts toward it.
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div>
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
              content={
                <Button onClick={openRegisterBankAccountDrawer}>Register Bank Account</Button>
              }
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
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId}>Add Goal</form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
