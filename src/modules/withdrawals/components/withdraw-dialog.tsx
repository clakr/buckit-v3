import { IconPigMoney } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-form";
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
import { NotFoundError } from "#/lib/errors";
import {
  centsToAmountInput,
  describeInsufficientHeld,
  exceedsAvailable,
  formatMoney,
} from "#/lib/money";
import { bucketQueryOption } from "#/modules/buckets/query-options";
import { useLogWithdrawalMutation } from "#/modules/withdrawals/mutations";
import { withdrawalSourcesQueryOption } from "#/modules/withdrawals/query-options";
import { logWithdrawalSchema } from "#/modules/withdrawals/schemas";
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

export const useWithdrawDialogStore = createDialogStore<{ bucketId: Bucket["id"] | null }>({
  bucketId: null,
});

export function WithdrawDialog() {
  const { isOpen, payload, close } = useWithdrawDialogStore();
  const { bucketId } = payload;

  const mutation = useLogWithdrawalMutation();

  const defaultValues: z.input<typeof logWithdrawalSchema> = {
    bucketId: bucketId ?? "",
    bankAccountId: "",
    amount: 0,
    date: new Date(),
    note: "",
  };

  const {
    status: bucketStatus,
    refetch: refetchBucket,
    data: bucket,
    error: bucketError,
  } = useQuery({
    ...bucketQueryOption(bucketId ?? ""),
    enabled: isOpen && bucketId !== null,
  });

  const {
    status: sourcesStatus,
    refetch: refetchSources,
    data: sources,
  } = useQuery({
    ...withdrawalSourcesQueryOption(bucketId ?? ""),
    enabled: isOpen && bucketId !== null,
  });

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
      close();
    },
  });

  const bankAccountId = useSelector(form.store, (state) => state.values.bankAccountId);

  async function handleOnOpenChange(open: boolean) {
    if (!open && form.state.isDirty) {
      const confirmed = await confirm("Discard new withdrawal?", {
        description: "The withdrawal details you entered will be lost.",
        confirmLabel: "Keep Editing",
        cancelLabel: "Discard",
        dismissValue: true,
      });

      if (confirmed) return;
    }

    form.reset();

    close();
  }

  if (!bucketId) return null;

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
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw Money</DialogTitle>
          {isReady ? (
            <DialogDescription>
              Spend money from {bucket.name}. It leaves the bank account as an expense.
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div>
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
              content={
                <Button variant="secondary" onClick={close}>
                  Close
                </Button>
              }
            />
          ) : null}
          {isReady && !hasSources ? (
            <StateTemplate
              state="empty"
              icon={<IconPigMoney />}
              title="Nothing to withdraw"
              description={`${bucket.name} holds no money right now. Allocate money into it first.`}
              content={
                <Button variant="secondary" onClick={close}>
                  Close
                </Button>
              }
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
                            </span>{" "}
                            <Button
                              type="button"
                              variant="link"
                              size="xs"
                              onClick={() =>
                                field.handleChange(centsToAmountInput(selectedSource.held))
                              }
                            >
                              Take all
                            </Button>
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
                  {(field) => (
                    <field.Textarea label="Note (optional)" placeholder="Add a note..." />
                  )}
                </form.AppField>
              </FieldGroup>
            </form>
          ) : null}
        </div>
        {isReady && hasSources ? (
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId}>Withdraw Money</form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
