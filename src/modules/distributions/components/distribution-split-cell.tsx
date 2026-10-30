import type { SavedDistribution } from "#/modules/distributions/functions";

import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { SEGMENT_SHADES } from "#/modules/distributions/components/split-summary";
import { computeDistributionPlan, savedLinesToPlanLines } from "#/modules/distributions/utils";

function formatCount(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

/** How the Default Amount divides across the lines, as the stacked bar the drawer draws. */
export function DistributionSplitCell({ distribution }: { distribution: SavedDistribution }) {
  const { amount, lines, bankAccount } = distribution;
  const plan = computeDistributionPlan(savedLinesToPlanLines(lines), amount);
  const barTotal = Math.max(plan.bucketAndPayableTotal, amount);

  const bucketCount = lines.filter((line) => line.kind === "bucket").length;
  const debtCount = lines.length - bucketCount;
  const summary = [
    bucketCount > 0 ? formatCount(bucketCount, "Bucket") : null,
    debtCount > 0 ? formatCount(debtCount, "Debt") : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Tooltip>
      <TooltipTrigger render={<div className="flex w-40 flex-col gap-y-1.5 text-start" />}>
        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
          {barTotal > 0
            ? plan.plannedLines.flatMap((line, index) =>
                line.kind !== "receivable" && line.cents > 0
                  ? [
                      <div
                        key={line.id}
                        className={cn(
                          SEGMENT_SHADES[index % SEGMENT_SHADES.length],
                          plan.exceedsBucketAndPayable && "bg-destructive",
                        )}
                        style={{ width: `${(line.cents / barTotal) * 100}%` }}
                      />,
                    ]
                  : [],
              )
            : null}
        </div>
        <span className="text-xs text-muted-foreground">{summary}</span>
      </TooltipTrigger>
      <TooltipContent>
        <ul className="flex flex-col gap-y-0.5 tabular-nums">
          {plan.plannedLines.map((line, index) => {
            const saved = lines[index];

            return (
              <li key={line.id} className="flex justify-between gap-x-4">
                <span className="min-w-0 wrap-break-word">
                  {saved.targetName}
                  {line.kind === "bucket" ? "" : ` (${line.kind})`}
                </span>
                <span className="whitespace-nowrap">
                  {saved.basisPoints === null ? "" : `${saved.basisPoints / 100}% · `}
                  {formatMoney(line.cents, bankAccount.currency)}
                </span>
              </li>
            );
          })}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
