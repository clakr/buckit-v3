import { IconBuildingBank, IconCalendar, IconX } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { format, startOfToday } from "date-fns";
import z from "zod";

import type { Bucket } from "#/db/schema";

import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { useAppForm } from "#/integrations/tanstack-form";
import { useRegisterBankAccountDialogStore } from "#/modules/bank-accounts/components/register-bank-account-dialog";
import { bucketQueryOption } from "#/modules/buckets/query-options";
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

  const currency = useSelector(form.store, (state) => state.values.currency);

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

  function openRegisterBankAccountDialog() {
    close();
    useRegisterBankAccountDialogStore.getState().open();
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
                <Button onClick={openRegisterBankAccountDialog}>Register Bank Account</Button>
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
                <form.AppField name="currency">
                  {(field) => (
                    <field.Select
                      label="Currency"
                      placeholder="Select currency"
                      options={currencies?.map((code) => ({ value: code, label: code })) ?? []}
                    />
                  )}
                </form.AppField>
                <form.AppField name="targetAmount">
                  {(field) => (
                    <field.AmountInput
                      label="Target Amount"
                      min={0.01}
                      step={0.01}
                      required
                      placeholder="0.00"
                      currency={currency}
                    />
                  )}
                </form.AppField>
                <form.AppField name="targetDate">
                  {(field) => {
                    const targetDate = field.state.value;
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                    const triggerId = `${form.formId}-target-date`;
                    const errorId = `${triggerId}-error`;

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={triggerId}>Target Date (optional)</FieldLabel>
                        <div className="flex gap-x-2">
                          <Popover>
                            <PopoverTrigger
                              render={
                                <Button
                                  id={triggerId}
                                  variant="outline"
                                  data-empty={!targetDate}
                                  className="flex-1 justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
                                  aria-invalid={isInvalid ? true : undefined}
                                  aria-describedby={isInvalid ? errorId : undefined}
                                />
                              }
                            >
                              <IconCalendar />
                              {targetDate ? format(targetDate, "PPP") : <span>No target date</span>}
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={targetDate ?? undefined}
                                disabled={{ before: startOfToday() }}
                                onSelect={(value) => field.handleChange(value ?? null)}
                                onDayBlur={field.handleBlur}
                              />
                            </PopoverContent>
                          </Popover>
                          {targetDate ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              aria-label="Clear target date"
                              onClick={() => field.handleChange(null)}
                            >
                              <IconX />
                            </Button>
                          ) : null}
                        </div>
                        <FieldDescription>Leave empty to save without a deadline.</FieldDescription>
                        {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                </form.AppField>
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
