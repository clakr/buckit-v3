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

  return (
    <div className="flex flex-col gap-y-1 border-t pt-3">
      <div className="flex justify-between">
        <span className="font-medium">Split</span>
        <span
          className={cn("tabular-nums", exceeds ? "text-destructive" : "text-muted-foreground")}
        >
          {amountCents ? Math.round((plan.bucketAndPayableTotal / amountCents) * 100) : 0}% to
          Buckets
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {amountCents
          ? plan.plannedLines.map((line, index) => (
              <div
                key={line.id}
                className={cn(
                  SEGMENT_SHADES[index % SEGMENT_SHADES.length],
                  exceeds && "bg-destructive",
                )}
                style={{
                  width: `${(line.cents / Math.max(plan.bucketAndPayableTotal, amountCents)) * 100}%`,
                }}
              />
            ))
          : null}
      </div>
      <div className="flex justify-between text-muted-foreground tabular-nums">
        <span>
          {exceeds
            ? `${formatMoney(plan.bucketAndPayableTotal - amountCents, currency)} over the default amount`
            : `${formatMoney(plan.remainingCents, currency)} stays Unallocated`}
        </span>
        <span>
          {formatMoney(plan.bucketAndPayableTotal, currency)} of{" "}
          {formatMoney(amountCents, currency)}
        </span>
      </div>
    </div>
  );
}
