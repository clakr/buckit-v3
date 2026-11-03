import { IconChevronDown } from "@tabler/icons-react";

import type { BankAccount } from "#/db/schema";
import type { getBuckets } from "#/modules/buckets/functions";

import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { CURRENCIES } from "#/lib/constants";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { AccountStat } from "#/modules/bank-accounts/components/account-stat";
import { getBucketGoalFilter } from "#/modules/buckets/components/buckets-goal-filter";

type BucketRow = Awaited<ReturnType<typeof getBuckets>>[number];

export type BucketCurrencyTotals = {
  currency: BankAccount["currency"];
  bucketCount: number;
  amount: number;
};

export function getBucketCurrencyTotals(buckets: Pick<BucketRow, "subtotals">[]) {
  const totalsByCurrency = new Map<BankAccount["currency"], BucketCurrencyTotals>();
  for (const { subtotals } of buckets)
    for (const { currency, amount } of subtotals) {
      const totals = totalsByCurrency.get(currency) ?? { currency, bucketCount: 0, amount: 0 };
      totals.bucketCount += 1;
      totals.amount += amount;
      totalsByCurrency.set(currency, totals);
    }

  return [...totalsByCurrency.values()].sort(
    (a, b) => b.bucketCount - a.bucketCount || a.currency.localeCompare(b.currency),
  );
}

const OVERVIEW_TILE_LIMIT = 4;

function formatBucketCount(totals: BucketCurrencyTotals) {
  return `${totals.currency} · ${totals.bucketCount} ${totals.bucketCount === 1 ? "bucket" : "buckets"}`;
}

type Props = {
  currencyTotals: BucketCurrencyTotals[];
  goals: BucketRow["goal"][];
};

export function BucketsOverview({ currencyTotals, goals }: Props) {
  const [onlyCurrency] = currencyTotals;
  const setGoals = goals.filter((goal) => goal !== null);
  const reachedCount = setGoals.filter((goal) => getBucketGoalFilter(goal) === "reached").length;
  const overdueCount = setGoals.filter((goal) => getBucketGoalFilter(goal) === "overdue").length;

  if (!onlyCurrency && setGoals.length === 0) return null;

  const visibleTotals =
    currencyTotals.length > OVERVIEW_TILE_LIMIT
      ? currencyTotals.slice(0, OVERVIEW_TILE_LIMIT - 1)
      : currencyTotals;
  const hiddenTotals = currencyTotals.slice(visibleTotals.length);

  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-x-10 gap-y-3",
        currencyTotals.length > 1 &&
          "max-sm:-mx-4 max-sm:snap-x max-sm:scroll-px-4 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:px-4 max-sm:*:shrink-0 max-sm:*:snap-start",
      )}
    >
      {onlyCurrency ? (
        <dl
          aria-label="Buckets overview"
          className="flex flex-wrap items-start gap-x-10 gap-y-3 max-sm:flex-nowrap max-sm:*:shrink-0"
        >
          {currencyTotals.length === 1 ? (
            <AccountStat
              label="Earmarked"
              value={onlyCurrency.amount}
              currency={onlyCurrency.currency}
            />
          ) : (
            visibleTotals.map((totals) => (
              <AccountStat
                key={totals.currency}
                label={formatBucketCount(totals)}
                value={totals.amount}
                currency={totals.currency}
              />
            ))
          )}
        </dl>
      ) : null}
      {hiddenTotals.length ? (
        <Popover>
          <PopoverTrigger className="-m-2 flex flex-col items-start gap-y-0.5 rounded-md p-2 text-start transition-colors hover:bg-muted aria-expanded:bg-muted">
            <span className="text-xs text-muted-foreground">
              {hiddenTotals.length} more currencies
            </span>
            <span className="flex items-center gap-x-1 text-xl">
              {hiddenTotals.map((totals) => (
                <span key={totals.currency} aria-hidden>
                  {CURRENCIES.find(({ code }) => code === totals.currency)?.flag}
                </span>
              ))}
              <IconChevronDown aria-hidden className="size-4 text-muted-foreground" />
            </span>
            <span className="text-xs text-muted-foreground">
              {hiddenTotals.map((totals) => totals.currency).join(", ")}
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto min-w-64">
            <dl aria-label="More currencies" className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3">
              {hiddenTotals.map((totals) => (
                <div
                  key={totals.currency}
                  className="col-span-2 grid grid-cols-subgrid items-start"
                >
                  <dt className="text-muted-foreground">{formatBucketCount(totals)}</dt>
                  <dd className="text-end font-semibold tabular-nums">
                    {formatMoney(totals.amount, totals.currency)}
                  </dd>
                </div>
              ))}
            </dl>
          </PopoverContent>
        </Popover>
      ) : null}
      {setGoals.length ? (
        <dl aria-label="Goals overview" className="flex flex-col gap-y-0.5">
          <dt className="text-xs text-muted-foreground">Goals reached</dt>
          <dd className="text-xl font-semibold tabular-nums">
            {reachedCount} of {setGoals.length}
          </dd>
          <dd
            className={cn(
              "text-xs tabular-nums",
              overdueCount ? "font-medium text-destructive" : "text-muted-foreground",
            )}
          >
            {overdueCount} overdue
          </dd>
        </dl>
      ) : null}
    </div>
  );
}
