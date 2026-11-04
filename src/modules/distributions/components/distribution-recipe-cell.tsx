import { IconAlertTriangle, IconChevronDown } from "@tabler/icons-react";

import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import {
  describeAttentionReason,
  getAttentionTargetId,
  type DistributionRow,
} from "#/modules/distributions/attention";
import { DistributionLineKindIcon } from "#/modules/distributions/components/distribution-line-kind-icon";

const VISIBLE_LINE_LIMIT = 3;
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

export function DistributionRecipeCell({ distribution }: { distribution: DistributionRow }) {
  const { plan, lines, bankAccount, attention } = distribution;

  function formatDistributionAmount(cents: number) {
    return formatMoney(cents, bankAccount.currency);
  }

  const attentionByTargetId = new Map(attention.map((item) => [getAttentionTargetId(item), item]));
  const recipeLines: RecipeLine[] = plan.plannedLines
    .map((line, index) => {
      const lineAttention = attentionByTargetId.get(line.id);

      return {
        id: line.id,
        kind: line.kind,
        name: lines[index].targetName,
        rule: lines[index].basisPoints === null ? null : formatPercent(lines[index].basisPoints),
        cents: line.cents,
        attentionReason: lineAttention
          ? describeAttentionReason(lineAttention, formatDistributionAmount)
          : null,
      };
    })
    .sort(
      (a, b) =>
        Number(b.attentionReason !== null) - Number(a.attentionReason !== null) ||
        b.cents - a.cents ||
        a.name.localeCompare(b.name),
    );

  const visibleLines =
    recipeLines.length > VISIBLE_LINE_LIMIT
      ? recipeLines.slice(0, VISIBLE_LINE_LIMIT - 1)
      : recipeLines;
  const hiddenLines = recipeLines.slice(visibleLines.length);

  return (
    <ul
      aria-label={`Where ${distribution.name} goes`}
      className={cn(RECIPE_GRID, "w-full gap-y-0.5 text-xs sm:w-80")}
    >
      {visibleLines.map((line) => (
        <RecipeLineItem
          key={line.id}
          line={line}
          formatAmount={formatDistributionAmount}
          nameClassName="max-sm:line-clamp-2 max-sm:whitespace-normal sm:truncate"
        />
      ))}
      {hiddenLines.length ? (
        <li className="col-start-2 -col-end-1">
          <Popover>
            <PopoverTrigger className="flex w-fit items-center gap-x-0.5 text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground">
              +{hiddenLines.length} more
              {hiddenLines.some(({ attentionReason }) => attentionReason) ? (
                <IconAlertTriangle
                  aria-label="Needs a look"
                  className="size-3.5 text-amber-600 dark:text-amber-400"
                />
              ) : null}
              <IconChevronDown aria-hidden className="size-3.5" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 text-xs max-sm:w-72">
              <ul
                aria-label={`Every line in ${distribution.name}`}
                className={cn(RECIPE_GRID, "gap-y-1")}
              >
                {recipeLines.map((line) => (
                  <RecipeLineItem
                    key={line.id}
                    line={line}
                    formatAmount={formatDistributionAmount}
                    nameClassName="whitespace-normal"
                  />
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </li>
      ) : null}
      <li className={cn(RECIPE_ROW, "mt-0.5 text-muted-foreground")}>
        <span className="col-start-2 sm:col-end-4">Unallocated</span>
        <span className="text-end whitespace-nowrap">
          {formatDistributionAmount(plan.remainingCents)}
        </span>
      </li>
    </ul>
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
