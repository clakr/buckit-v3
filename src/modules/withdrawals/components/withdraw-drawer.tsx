import { IconPigMoney } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-form";
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
import { NotFoundError } from "#/lib/errors";
import { describeInsufficientHeld, exceedsAvailable, formatMoney } from "#/lib/money";
import { bucketQueryOption } from "#/modules/buckets/query-options";
import { useLogWithdrawalMutation } from "#/modules/withdrawals/mutations";
import { withdrawalSourcesQueryOption } from "#/modules/withdrawals/query-options";
import { logWithdrawalSchema } from "#/modules/withdrawals/schemas";
import { confirm } from "#/stores/use-confirm";

export const withdrawDrawerHandle = createDrawerHandle<{ bucketId: Bucket["id"] }>();

type WithdrawFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function WithdrawDrawer() {
  const formControlsRef = useRef<WithdrawFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard new withdrawal?", {
      description: "The withdrawal details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    withdrawDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={withdrawDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          {payload ? <WithdrawForm bucketId={payload.bucketId} ref={formControlsRef} /> : null}
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}

type WithdrawFormProps = {
  bucketId: Bucket["id"];
  ref: Ref<WithdrawFormControls>;
};

function WithdrawForm({ bucketId, ref }: WithdrawFormProps) {
  const mutation = useLogWithdrawalMutation();

  const {
    status: bucketStatus,
    refetch: refetchBucket,
    data: bucket,
    error: bucketError,
  } = useQuery({
    ...bucketQueryOption(bucketId),
    enabled: !mutation.isPending && !mutation.isSuccess,
  });

  const {
    status: sourcesStatus,
    refetch: refetchSources,
    data: liveSources,
  } = useQuery({
    ...withdrawalSourcesQueryOption(bucketId),
    enabled: !mutation.isPending && !mutation.isSuccess,
  });

  // The bucket page watches the same query, so a disabled observer here still sees its refetch
  // land. Hold the sources from before the save so the Drawer doesn't flash "Nothing to withdraw".
  const sourcesBeforeSaveRef = useRef(liveSources);
  if (!mutation.isPending && !mutation.isSuccess) sourcesBeforeSaveRef.current = liveSources;
  const sources = sourcesBeforeSaveRef.current;

  const defaultValues: z.input<typeof logWithdrawalSchema> = {
    bucketId,
    bankAccountId: "",
    amount: 0,
    date: new Date(),
    note: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: logWithdrawalSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      withdrawDrawerHandle.close();
    },
  });

  useImperativeHandle(
    ref,
    () => ({ isDirty: () => form.state.isDirty, reset: () => form.reset() }),
    [form],
  );

  const bankAccountId = useSelector(form.store, (state) => state.values.bankAccountId);

  function findSource(id: string) {
    return sources?.find((source) => source.id === id);
  }

  const selectedSource = findSource(bankAccountId);

  const isPending = bucketStatus === "pending" || sourcesStatus === "pending";

  const isBucketGone = bucketStatus === "error" && bucketError instanceof NotFoundError;

  const loadError = isBucketGone
    ? null
    : bucketStatus === "error"
      ? { noun: "bucket", retry: refetchBucket }
      : sourcesStatus === "error"
        ? { noun: "bank accounts", retry: refetchSources }
        : null;

  const isReady = bucketStatus === "success" && sourcesStatus === "success";

  const hasSources = Boolean(sources?.length);

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Withdraw Money</DrawerTitle>
        {isReady ? (
          <DrawerDescription>
            Spend money from {bucket.name}. It leaves the bank account as an expense.
          </DrawerDescription>
        ) : null}
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isPending && !loadError && !isBucketGone ? (
          <StateTemplate
            state="loading"
            title="Loading"
            description="Fetching what this bucket holds..."
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
        {isBucketGone ? (
          <StateTemplate
            state="error"
            title="Bucket not found"
            description="This bucket doesn't exist or may have been deleted."
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
          />
        ) : null}
        {isReady && !hasSources ? (
          <StateTemplate
            state="empty"
            icon={<IconPigMoney />}
            title="Nothing to withdraw"
            description={`${bucket.name} holds no money right now. Allocate money into it first.`}
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
          />
        ) : null}
        {isReady && hasSources ? (
          <form
            id={form.formId}
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField name="bankAccountId">
                {(field) => (
                  <field.Select
                    label="Bank Account"
                    placeholder="Select bank account"
                    items={sources?.map((source) => ({ value: source.id, label: source.name }))}
                    options={
                      sources?.map((source) => ({
                        value: source.id,
                        label: `${source.name} · ${formatMoney(source.held, source.currency)} held`,
                      })) ?? []
                    }
                  />
                )}
              </form.AppField>
              <form.AppField
                name="amount"
                validators={{
                  onChangeListenTo: ["bankAccountId"],
                  onChange: ({ value }) => {
                    const source = findSource(form.getFieldValue("bankAccountId"));
                    if (!source) return undefined;

                    return exceedsAvailable(value, source.held)
                      ? {
                          message: describeInsufficientHeld({
                            bucket,
                            bankAccount: source,
                            availableCents: source.held,
                          }),
                        }
                      : undefined;
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
                    currency={selectedSource?.currency}
                    disabled={!selectedSource}
                    description={
                      selectedSource ? (
                        <>
                          Available:{" "}
                          <span className="font-semibold">
                            {formatMoney(selectedSource.held, selectedSource.currency)}
                          </span>
                        </>
                      ) : undefined
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
      {isReady && hasSources ? (
        <DrawerFooter className="border-t pt-4">
          <form.AppForm>
            <form.Button form={form.formId}>Withdraw Money</form.Button>
          </form.AppForm>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      ) : null}
    </>
  );
}
