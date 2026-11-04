import { IconAlertTriangle } from "@tabler/icons-react";

import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import {
  describeAttentionReason,
  getAttentionTargetId,
  type DistributionRow,
} from "#/modules/distributions/attention";
import { DistributionLineKindIcon } from "#/modules/distributions/components/distribution-line-kind-icon";

const VISIBLE_NAME_LIMIT = 2;
const BAR_COLORS: Record<RecipeLine["kind"], string> = {
  bucket: "bg-primary",
  receivable: "bg-emerald-500",
  payable: "bg-amber-500",
};
const RECIPE_GRID =
  "grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-1.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]";
const RECIPE_ROW = "col-span-full grid grid-cols-subgrid items-baseline tabular-nums";

type RecipeLine = {
  id: string;
  kind: DistributionRow["plan"]["plannedLines"][number]["kind"];
  name: string;
  rule: string | null;
  cents: number;
  attentionReason: string | null;
};

function formatPercent(basisPoints: number) {
  return `${basisPoints / 100}%`;
}

function buildRecipeLines({ plan, lines, bankAccount, attention }: DistributionRow): RecipeLine[] {
  const attentionByTargetId = new Map(attention.map((item) => [getAttentionTargetId(item), item]));

  return plan.plannedLines
    .map((line, index) => {
      const lineAttention = attentionByTargetId.get(line.id);

      return {
        id: line.id,
        kind: line.kind,
        name: lines[index].targetName,
        rule: lines[index].basisPoints === null ? null : formatPercent(lines[index].basisPoints),
        cents: line.cents,
        attentionReason: lineAttention
          ? describeAttentionReason(lineAttention, (cents) =>
              formatMoney(cents, bankAccount.currency),
            )
          : null,
      };
    })
    .sort(
      (a, b) =>
        Number(b.attentionReason !== null) - Number(a.attentionReason !== null) ||
        b.cents - a.cents ||
        a.name.localeCompare(b.name),
    );
}

export function DistributionRecipeCell({ distribution }: { distribution: DistributionRow }) {
  const { plan, bankAccount, amount } = distribution;

  function formatDistributionAmount(cents: number) {
    return formatMoney(cents, bankAccount.currency);
  }

  const recipeLines = buildRecipeLines(distribution);
  const visibleNames = recipeLines.slice(0, VISIBLE_NAME_LIMIT).map(({ name }) => name);
  const hiddenCount = recipeLines.length - visibleNames.length;
  const needsLook = recipeLines.some(({ attentionReason }) => attentionReason);

  return (
    <div className="flex w-full flex-col gap-y-1.5 text-xs sm:w-80">
      <div
        role="img"
        aria-label={recipeLines
          .map(({ name, rule }) => (rule ? `${name} ${rule}` : name))
          .join(", ")}
        className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        {recipeLines.map((line) => (
          <div
            key={line.id}
            className={cn(
              "h-full border-r border-background last:border-r-0",
              BAR_COLORS[line.kind],
            )}
            style={{ width: `${(line.cents / amount) * 100}%` }}
          />
        ))}
      </div>

      <Popover>
        <PopoverTrigger
          aria-label={`Where ${distribution.name} goes`}
          className="flex w-fit max-w-full min-w-0 items-center gap-x-1 text-left text-muted-foreground hover:text-foreground"
        >
          <span className="truncate">
            {visibleNames.join(", ")}
            {hiddenCount > 0 ? ` +${hiddenCount}` : ""}
          </span>
          {needsLook ? (
            <IconAlertTriangle
              aria-label="Needs a look"
              className="size-3 shrink-0 text-amber-600 dark:text-amber-400"
            />
          ) : null}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 text-xs max-sm:w-72">
          <ul
            aria-label={`Every line in ${distribution.name}`}
            className={cn(
              RECIPE_GRID,
              "divide-y divide-border/75 [&>li]:py-2 [&>li:first-child]:pt-0 [&>li:last-child]:pb-0",
            )}
          >
            {recipeLines.map((line) => (
              <RecipeLineItem
                key={line.id}
                line={line}
                formatAmount={formatDistributionAmount}
                nameClassName="whitespace-normal"
              />
            ))}
            <li className={cn(RECIPE_ROW, "text-muted-foreground")}>
              <span className="col-start-2 sm:col-end-4">Unallocated</span>
              <span className="text-end whitespace-nowrap">
                {formatDistributionAmount(plan.remainingCents)}
              </span>
            </li>
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function RecipeLineItem({
  line,
  formatAmount,
  nameClassName,
}: {
  line: RecipeLine;
  formatAmount: (cents: number) => string;
  nameClassName: string;
}) {
  return (
    <li className={RECIPE_ROW}>
      <span className="mt-px flex self-start">
        <DistributionLineKindIcon kind={line.kind} />
      </span>
      <span title={line.name} className={cn("wrap-break-word", nameClassName)}>
        {line.name}
      </span>
      <span className="text-muted-foreground max-sm:col-start-2 max-sm:row-start-2 sm:text-end">
        {line.rule}
      </span>
      <span
        className={cn(
          "text-end whitespace-nowrap max-sm:col-start-3 max-sm:row-start-1",
          line.kind === "receivable" && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {formatAmount(line.cents)}
      </span>
      {line.attentionReason ? (
        <span className="col-start-2 -col-end-1 flex items-center gap-x-1 text-amber-600 dark:text-amber-400">
          <IconAlertTriangle aria-hidden className="size-3 shrink-0" />
          <span className="sr-only">Needs a look: </span>
          {line.attentionReason}
        </span>
      ) : null}
    </li>
  );
}
