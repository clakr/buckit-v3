import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { computeDistributionPlan, type DistributionPlanLine } from "#/modules/distributions/utils";

export const SEGMENT_SHADES = [
  "bg-primary",
  "bg-primary/75",
  "bg-primary/55",
  "bg-primary/40",
  "bg-primary/25",
];

/** How the amount splits between the lines and what stays Unallocated. */
export function SplitSummary({
  lines,
  amountCents,
  currency,
}: {
  lines: DistributionPlanLine[];
  amountCents: number;
  currency: string;
}) {
  const plan = computeDistributionPlan(lines, amountCents);
  const exceeds = plan.exceedsBucketAndPayable;
  const takesMoney = (kind: DistributionPlanLine["kind"]) => kind !== "receivable";

  return (
    <div className="flex flex-col gap-y-1 border-t pt-3">
      <div className="flex justify-between">
        <span className="font-medium">Split</span>
        <span
          className={cn("tabular-nums", exceeds ? "text-destructive" : "text-muted-foreground")}
        >
          {amountCents ? Math.round((plan.bucketAndPayableTotal / amountCents) * 100) : 0}% to
          Buckets and payables
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {amountCents
          ? plan.plannedLines.flatMap((line, index) =>
              takesMoney(line.kind)
                ? [
                    <div
                      key={line.id}
                      className={cn(
                        SEGMENT_SHADES[index % SEGMENT_SHADES.length],
                        exceeds && "bg-destructive",
                      )}
                      style={{
                        width: `${(line.cents / Math.max(plan.bucketAndPayableTotal, amountCents)) * 100}%`,
                      }}
                    />,
                  ]
                : [],
            )
          : null}
      </div>
      <div className="flex justify-between text-muted-foreground tabular-nums">
        <span>
          {exceeds
            ? `${formatMoney(plan.bucketAndPayableTotal - amountCents, currency)} over the amount`
            : `${formatMoney(plan.remainingCents, currency)} stays Unallocated`}
        </span>
        <span>
          {formatMoney(plan.bucketAndPayableTotal, currency)} of{" "}
          {formatMoney(amountCents, currency)}
        </span>
      </div>
      {plan.receivableTotal > 0 ? (
        <span
          className={cn(
            "tabular-nums",
            plan.exceedsReceivable ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {plan.exceedsReceivable
            ? `Receivable lines add up to ${formatMoney(plan.receivableTotal, currency)}, more than the amount.`
            : `${formatMoney(plan.receivableTotal, currency)} of the amount repays receivables.`}
        </span>
      ) : null}
    </div>
  );
}
