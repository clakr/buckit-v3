import type { SavedDistribution } from "#/modules/distributions/functions";

import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { computeDistributionPlan, savedLinesToPlanLines } from "#/modules/distributions/utils";

// Same shades, in the same order, as the drawer's split bar and line dots.
const SLICE_FILLS = [
  "fill-primary",
  "fill-primary/75",
  "fill-primary/55",
  "fill-primary/40",
  "fill-primary/25",
];

const PIE_SIZE = 40;
const PIE_CENTER = PIE_SIZE / 2;
const PIE_RADIUS = PIE_CENTER - 1;

function formatCount(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function getSlicePath(startFraction: number, endFraction: number) {
  const point = (fraction: number) => {
    const angle = fraction * 2 * Math.PI;

    return `${PIE_CENTER + PIE_RADIUS * Math.sin(angle)} ${PIE_CENTER - PIE_RADIUS * Math.cos(angle)}`;
  };
  const largeArc = endFraction - startFraction > 0.5 ? 1 : 0;

  return `M ${PIE_CENTER} ${PIE_CENTER} L ${point(startFraction)} A ${PIE_RADIUS} ${PIE_RADIUS} 0 ${largeArc} 1 ${point(endFraction)} Z`;
}

/** How the Default Amount divides across the lines, with what stays Unallocated as the grey rest. */
export function DistributionSplitCell({ distribution }: { distribution: SavedDistribution }) {
  const { amount, lines, bankAccount } = distribution;
  const plan = computeDistributionPlan(savedLinesToPlanLines(lines), amount);
  const pieTotal = Math.max(plan.bucketAndPayableTotal, amount);

  const bucketCount = lines.filter((line) => line.kind === "bucket").length;
  const debtCount = lines.length - bucketCount;
  const summary = [
    bucketCount > 0 ? formatCount(bucketCount, "Bucket") : null,
    debtCount > 0 ? formatCount(debtCount, "Debt") : null,
  ]
    .filter(Boolean)
    .join(", ");

  const percentAllocated =
    pieTotal > 0 ? Math.round((plan.bucketAndPayableTotal / pieTotal) * 100) : 0;

  // A receivable line repays a Debt out of the amount without leaving the account, so it has no slice.
  let startFraction = 0;
  const slices = plan.plannedLines.flatMap((line, index) => {
    if (line.kind === "receivable" || line.cents <= 0 || pieTotal <= 0) return [];

    const endFraction = startFraction + line.cents / pieTotal;
    const slice = { id: line.id, index, startFraction, endFraction };
    startFraction = endFraction;

    return [slice];
  });

  return (
    <Tooltip>
      <TooltipTrigger render={<div className="flex items-center gap-x-3 text-start" />}>
        <svg
          viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`}
          className="size-10 shrink-0"
          role="img"
          aria-label={`${percentAllocated}% allocated to ${summary}`}
        >
          <circle cx={PIE_CENTER} cy={PIE_CENTER} r={PIE_RADIUS} className="fill-muted" />
          {slices.map((slice) =>
            slice.endFraction - slice.startFraction >= 0.9999 ? (
              <circle
                key={slice.id}
                cx={PIE_CENTER}
                cy={PIE_CENTER}
                r={PIE_RADIUS}
                className={cn(
                  SLICE_FILLS[slice.index % SLICE_FILLS.length],
                  plan.exceedsBucketAndPayable && "fill-destructive",
                )}
              />
            ) : (
              <path
                key={slice.id}
                d={getSlicePath(slice.startFraction, slice.endFraction)}
                className={cn(
                  SLICE_FILLS[slice.index % SLICE_FILLS.length],
                  plan.exceedsBucketAndPayable && "fill-destructive",
                )}
              />
            ),
          )}
        </svg>
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
