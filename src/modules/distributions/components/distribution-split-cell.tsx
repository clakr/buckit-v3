import { Pie, PieChart, Sector } from "recharts";

import type { SavedDistribution } from "#/modules/distributions/functions";

import { ChartContainer } from "#/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { computeDistributionPlan, savedLinesToPlanLines } from "#/modules/distributions/utils";

// Same shades, in the same order, as the drawer's split bar and line dots. The label colour is
// whichever of foreground and primary-foreground reads on its shade.
const SLICE_STYLES = [
  { fill: "fill-primary", text: "fill-primary-foreground" },
  { fill: "fill-primary/75", text: "fill-primary-foreground" },
  { fill: "fill-primary/55", text: "fill-foreground" },
  { fill: "fill-primary/40", text: "fill-foreground" },
  { fill: "fill-primary/25", text: "fill-foreground" },
];
const UNALLOCATED_STYLE = { fill: "fill-muted", text: "fill-muted-foreground" };
const EXCEEDS_STYLE = { fill: "fill-destructive", text: "fill-background" };

/** A slice narrower than this has no room for its percentage. The tooltip still lists it. */
const MIN_LABELLED_FRACTION = 0.12;

const PIE_SIZE = 80;

type Slice = {
  id: string;
  name: string;
  cents: number;
  fraction: number;
  style: { fill: string; text: string };
};

function formatCount(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
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
  const slices: Slice[] = plan.plannedLines.flatMap((line, index) =>
    line.kind === "receivable" || line.cents <= 0 || pieTotal <= 0
      ? []
      : [
          {
            id: line.id,
            name: lines[index].targetName,
            cents: line.cents,
            fraction: line.cents / pieTotal,
            style: plan.exceedsBucketAndPayable
              ? EXCEEDS_STYLE
              : SLICE_STYLES[index % SLICE_STYLES.length],
          },
        ],
  );
  const unallocatedCents = pieTotal - plan.bucketAndPayableTotal;
  if (unallocatedCents > 0) {
    slices.push({
      id: "unallocated",
      name: "Unallocated",
      cents: unallocatedCents,
      fraction: unallocatedCents / pieTotal,
      style: UNALLOCATED_STYLE,
    });
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<div className="flex items-center gap-x-3 text-start" />}>
        <ChartContainer
          config={{}}
          className="aspect-square size-20 shrink-0"
          initialDimension={{ width: PIE_SIZE, height: PIE_SIZE }}
          role="img"
          aria-label={`${percentAllocated}% allocated to ${summary}`}
        >
          <PieChart accessibilityLayer={false}>
            <Pie
              data={slices}
              dataKey="cents"
              nameKey="name"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
              rootTabIndex={-1}
              labelLine={false}
              shape={(props) => {
                const slice: Slice = props.payload;

                return <Sector {...props} className={slice.style.fill} />;
              }}
              label={({ cx, cy, midAngle, outerRadius, payload }) => {
                const slice: Slice = payload;
                if (slice.fraction < MIN_LABELLED_FRACTION) return null;

                const angle = (-(midAngle ?? 0) * Math.PI) / 180;
                const radius = outerRadius * 0.62;

                return (
                  <text
                    x={cx + radius * Math.cos(angle)}
                    y={cy + radius * Math.sin(angle)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={cn("text-[10px] font-semibold tabular-nums", slice.style.text)}
                  >
                    {Math.round(slice.fraction * 100)}%
                  </text>
                );
              }}
            />
          </PieChart>
        </ChartContainer>
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
