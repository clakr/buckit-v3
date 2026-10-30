import { IconAlertTriangle } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import type { Distribution } from "#/db/schema";

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
import { centsToAmountInput, formatMoney } from "#/lib/money";
import { SplitSummary } from "#/modules/distributions/components/split-summary";
import { useTriggerDistributionMutation } from "#/modules/distributions/mutations";
import {
  distributionPreviewQueryOptions,
  distributionsQueryOptions,
} from "#/modules/distributions/query-options";
import { triggerDistributionSchema } from "#/modules/distributions/schemas";
import {
  computeDistributionPlan,
  savedLinesToPlanLines,
  toCents,
  type DebtLineWarning,
  type DistributionPlanLine,
} from "#/modules/distributions/utils";
import { confirm } from "#/stores/use-confirm";

export const triggerDistributionDrawerHandle = createDrawerHandle<{
  distributionId: Distribution["id"];
}>();

type TriggerDistributionFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function TriggerDistributionDrawer() {
  const formControlsRef = useRef<TriggerDistributionFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard triggering distribution?", {
      description: "The amount you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    triggerDistributionDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={triggerDistributionDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          {payload ? (
            <TriggerDistributionForm
              distributionId={payload.distributionId}
              ref={formControlsRef}
            />
          ) : null}
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}

type TriggerDistributionFormProps = {
  distributionId: Distribution["id"];
  ref: Ref<TriggerDistributionFormControls>;
};

function describeRecord(kind: DistributionPlanLine["kind"], targetName: string | undefined) {
  if (kind === "bucket") return `Allocation to ${targetName}`;

  return `Repayment on ${targetName} (${kind === "receivable" ? "income" : "expense"})`;
}

function describeWarning(warning: DebtLineWarning, debtName: string, currency: string) {
  switch (warning.kind) {
    case "overpays":
      return `${debtName}: overpays by ${formatMoney(warning.overpaidByCents ?? 0, currency)}. It will be applied as written.`;
    case "settled":
      return `${debtName} is already Settled. The repayment will still be applied.`;
    case "forgiven":
      return `${debtName} is Forgiven. The repayment will reopen it.`;
  }
}

function TriggerDistributionForm({ distributionId, ref }: TriggerDistributionFormProps) {
  const {
    status,
    refetch,
    data: distribution,
  } = useQuery({
    ...distributionsQueryOptions,
    select: (distributions) =>
      distributions.find((distribution) => distribution.id === distributionId),
  });

  const mutation = useTriggerDistributionMutation();

  const defaultValues: z.input<typeof triggerDistributionSchema> = {
    distributionId,
    amount: centsToAmountInput(distribution?.amount ?? 0),
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: triggerDistributionSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      triggerDistributionDrawerHandle.close();
    },
  });

  useImperativeHandle(
    ref,
    () => ({ isDirty: () => form.state.isDirty, reset: () => form.reset() }),
    [form],
  );

  const amount = useSelector(form.store, (state) => state.values.amount);
  const amountCents = toCents(String(amount ?? ""));

  const currency = distribution?.bankAccount.currency ?? "";
  const planLines = savedLinesToPlanLines(distribution?.lines ?? []);
  const plan = computeDistributionPlan(planLines, amountCents);
  const targetNameById = new Map(
    (distribution?.lines ?? []).map((line) => [line.targetId, line.targetName]),
  );

  // Warnings never block. They ride along the typed amount, so the previous ones stay up while it loads.
  const previewQuery = useQuery(distributionPreviewQueryOptions(distributionId, amountCents));
  const warnings = amountCents > 0 ? (previewQuery.data?.warnings ?? []) : [];

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Trigger {distribution?.name ?? "Distribution"}</DrawerTitle>
        <DrawerDescription>
          Review the records this will write before you confirm. The amount is the only thing you
          can change.
        </DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {status === "pending" ? (
          <StateTemplate
            state="loading"
            title="Loading distribution"
            description="Fetching distribution details..."
          />
        ) : null}
        {status === "error" ? (
          <StateTemplate
            state="error"
            title="Could not load distribution"
            description="We weren't able to retrieve this distribution. Please check your connection and try again."
            content={<Button onClick={() => refetch()}>Retry</Button>}
          />
        ) : null}
        {status === "success" && !distribution ? (
          <StateTemplate
            state="error"
            title="Distribution not found"
            description="This distribution doesn't exist or may have been deleted."
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
          />
        ) : null}
        {distribution ? (
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
                  // Reads the typed value, not `plan`, which still holds the previous render's amount.
                  onChange: ({ value }) => {
                    const typedPlan = computeDistributionPlan(planLines, toCents(String(value)));

                    if (typedPlan.exceedsBucketAndPayable) {
                      return {
                        message: `Bucket and payable lines add up to ${formatMoney(typedPlan.bucketAndPayableTotal, currency)}, more than this amount.`,
                      };
                    }
                    if (typedPlan.exceedsReceivable) {
                      return {
                        message: `Receivable lines add up to ${formatMoney(typedPlan.receivableTotal, currency)}, more than this amount.`,
                      };
                    }

                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <field.AmountInput
                    label="Amount"
                    currency={currency}
                    placeholder="0.00"
                    min={0.01}
                    step={0.01}
                    required
                    description={`Default: ${formatMoney(distribution.amount, currency)} into ${distribution.bankAccount.name}`}
                  />
                )}
              </form.AppField>
              <div className="flex flex-col gap-y-2 border-t pt-3">
                <span className="font-medium">Records to write</span>
                <p className="text-muted-foreground">
                  Dated today and noted &ldquo;{distribution.name}&rdquo;.
                </p>
                <ul className="flex flex-col gap-y-1 tabular-nums">
                  {plan.salaryCents > 0 ? (
                    <li className="flex justify-between gap-x-4">
                      <span>Income</span>
                      <span>{formatMoney(plan.salaryCents, currency)}</span>
                    </li>
                  ) : null}
                  {plan.plannedLines.map((line) => (
                    <li
                      key={line.id}
                      className="flex justify-between gap-x-4 data-[skipped=true]:text-muted-foreground data-[skipped=true]:line-through"
                      data-skipped={line.cents <= 0}
                    >
                      <span className="min-w-0 wrap-break-word">
                        {describeRecord(line.kind, targetNameById.get(line.id))}
                      </span>
                      <span>{formatMoney(line.cents, currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {warnings.length > 0 ? (
                <ul className="flex flex-col gap-y-1.5 rounded-md border border-amber-500/50 bg-amber-500/10 p-2">
                  {warnings.map((warning) => (
                    <li key={warning.debtId} className="flex items-start gap-x-2">
                      <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                      <span className="min-w-0 wrap-break-word">
                        {describeWarning(
                          warning,
                          targetNameById.get(warning.debtId) ?? "This debt",
                          currency,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <SplitSummary lines={planLines} amountCents={amountCents} currency={currency} />
            </FieldGroup>
          </form>
        ) : null}
      </div>
      {distribution ? (
        <DrawerFooter className="border-t pt-4">
          <form.AppForm>
            <form.Button form={form.formId}>Confirm</form.Button>
          </form.AppForm>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      ) : null}
    </>
  );
}
