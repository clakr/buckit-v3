import { IconChevronDown } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";

import type { BankAccount } from "#/db/schema";
import type { getBuckets } from "#/modules/buckets/functions";

import { Stat } from "#/components/stat";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { CURRENCIES } from "#/lib/constants";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { getBucketGoalFilter } from "#/modules/buckets/components/buckets-goal-filter";
import { getGoalMonthlyAmount, getGoalStatus } from "#/modules/goals/utils";

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

const VISIBLE_CURRENCY_LIMIT = 4;

function formatBucketCount(bucketCount: number) {
  return `${bucketCount} ${bucketCount === 1 ? "bucket" : "buckets"}`;
}

function getCurrencyFlag(currency: BankAccount["currency"]) {
  return CURRENCIES.find(({ code }) => code === currency)?.flag;
}

type GoalBucket = Pick<BucketRow, "id" | "name"> & { goal: NonNullable<BucketRow["goal"]> };

function getMonthlyAmountsByCurrency(goalBuckets: GoalBucket[]) {
  const totalsByCurrency = new Map<
    BankAccount["currency"],
    { currency: BankAccount["currency"]; goalCount: number; amount: number }
  >();
  for (const { goal } of goalBuckets) {
    const monthlyAmount = getGoalMonthlyAmount(goal);
    if (monthlyAmount === null) continue;
    const totals = totalsByCurrency.get(goal.currency) ?? {
      currency: goal.currency,
      goalCount: 0,
      amount: 0,
    };
    totals.goalCount += 1;
    totals.amount += monthlyAmount;
    totalsByCurrency.set(goal.currency, totals);
  }

  return [...totalsByCurrency.values()].sort(
    (a, b) => b.goalCount - a.goalCount || a.currency.localeCompare(b.currency),
  );
}

function findNextTargetBucket(goalBuckets: GoalBucket[]) {
  let nextTargetBucket: (GoalBucket & { targetDate: Date }) | null = null;
  for (const bucket of goalBuckets) {
    const { targetDate } = bucket.goal;
    if (!targetDate || getGoalStatus(bucket.goal) !== "in progress") continue;
    if (!nextTargetBucket || targetDate < nextTargetBucket.targetDate)
      nextTargetBucket = { ...bucket, targetDate };
  }

  return nextTargetBucket;
}

type Props = {
  currencyTotals: BucketCurrencyTotals[];
  buckets: Pick<BucketRow, "id" | "name" | "goal">[];
};

export function BucketsOverview({ currencyTotals, buckets }: Props) {
  const goalBuckets = buckets.filter((bucket): bucket is GoalBucket => bucket.goal !== null);

  if (!currencyTotals.length && !goalBuckets.length) return null;

  return (
    <div className="flex flex-col gap-y-3">
      {goalBuckets.length ? <GoalTiles goalBuckets={goalBuckets} /> : null}
      {currencyTotals.length ? (
        <EarmarkedStrip
          currencyTotals={currencyTotals}
          className={cn(goalBuckets.length && "border-t pt-3")}
        />
      ) : null}
    </div>
  );
}

function GoalTiles({ goalBuckets }: { goalBuckets: GoalBucket[] }) {
  const reachedCount = goalBuckets.filter(
    ({ goal }) => getBucketGoalFilter(goal) === "reached",
  ).length;
  const overdueCount = goalBuckets.filter(
    ({ goal }) => getBucketGoalFilter(goal) === "overdue",
  ).length;
  const monthlyAmounts = getMonthlyAmountsByCurrency(goalBuckets);
  const [mainMonthlyAmount] = monthlyAmounts;
  const nextTargetBucket = findNextTargetBucket(goalBuckets);

  return (
    <dl
      aria-label="Goals overview"
      className="flex divide-x *:min-w-0 *:flex-1 *:px-4 *:first:ps-0 *:last:pe-0 max-sm:-mx-4 max-sm:snap-x max-sm:scroll-px-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:*:min-w-40 max-sm:*:shrink-0 max-sm:*:snap-start"
    >
      <Stat label="Goals reached" value={`${reachedCount} of ${goalBuckets.length}`}>
        <dd
          className={cn(
            "text-xs tabular-nums",
            overdueCount ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {overdueCount} overdue
        </dd>
      </Stat>
      {mainMonthlyAmount ? (
        <Stat
          label="To set aside monthly"
          value={formatMoney(mainMonthlyAmount.amount, mainMonthlyAmount.currency)}
        >
          <dd className="text-xs text-muted-foreground">
            {monthlyAmounts.length > 1 ? (
              <Popover>
                <PopoverTrigger className="flex items-center gap-x-0.5 underline decoration-dotted underline-offset-4 hover:text-foreground">
                  +{monthlyAmounts.length - 1} more{" "}
                  {monthlyAmounts.length === 2 ? "currency" : "currencies"}
                  <IconChevronDown aria-hidden className="size-3.5" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto min-w-56">
                  <dl
                    aria-label="To set aside monthly per currency"
                    className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2"
                  >
                    {monthlyAmounts.map(({ currency, goalCount, amount }) => (
                      <div key={currency} className="col-span-2 grid grid-cols-subgrid">
                        <dt className="text-muted-foreground">
                          <span aria-hidden>{getCurrencyFlag(currency)}</span> {currency} ·{" "}
                          {goalCount} {goalCount === 1 ? "goal" : "goals"}
                        </dt>
                        <dd className="text-end font-semibold tabular-nums">
                          {formatMoney(amount, currency)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </PopoverContent>
              </Popover>
            ) : (
              `across ${mainMonthlyAmount.goalCount} ${mainMonthlyAmount.goalCount === 1 ? "goal" : "goals"}`
            )}
          </dd>
        </Stat>
      ) : null}
      {nextTargetBucket ? (
        <Stat label="Next target" value={format(nextTargetBucket.targetDate, "MMM yyyy")}>
          <dd className="truncate text-xs">
            <Link
              to="/buckets/$bucketId"
              params={{ bucketId: nextTargetBucket.id }}
              title={nextTargetBucket.name}
              className="text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
            >
              {nextTargetBucket.name}
            </Link>
          </dd>
        </Stat>
      ) : null}
    </dl>
  );
}

function EarmarkedStrip({
  currencyTotals,
  className,
}: {
  currencyTotals: BucketCurrencyTotals[];
  className?: string;
}) {
  const visibleTotals =
    currencyTotals.length > VISIBLE_CURRENCY_LIMIT
      ? currencyTotals.slice(0, VISIBLE_CURRENCY_LIMIT - 1)
      : currencyTotals;
  const hiddenTotals = currencyTotals.slice(visibleTotals.length);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-xs max-sm:-mx-4 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:px-4 max-sm:*:shrink-0",
        className,
      )}
    >
      <span className="me-1 text-muted-foreground">Earmarked</span>
      <ul aria-label="Earmarked per currency" className="contents">
        {visibleTotals.map(({ currency, bucketCount, amount }) => (
          <li
            key={currency}
            className="flex items-center gap-x-1.5 rounded-md border bg-muted/50 px-2.5 py-1 whitespace-nowrap"
          >
            <span aria-hidden>{getCurrencyFlag(currency)}</span>
            <span className="font-semibold tabular-nums">{formatMoney(amount, currency)}</span>
            <span className="text-muted-foreground">{formatBucketCount(bucketCount)}</span>
          </li>
        ))}
      </ul>
      {hiddenTotals.length ? (
        <Popover>
          <PopoverTrigger className="flex items-center gap-x-1 rounded-md border border-dashed px-2.5 py-1 whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-expanded:bg-muted">
            +{hiddenTotals.length} more
            <span aria-hidden>
              {hiddenTotals.map(({ currency }) => getCurrencyFlag(currency)).join(" ")}
            </span>
            <IconChevronDown aria-hidden className="size-3.5" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto min-w-64">
            <dl aria-label="More currencies" className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2">
              {hiddenTotals.map(({ currency, bucketCount, amount }) => (
                <div key={currency} className="col-span-2 grid grid-cols-subgrid">
                  <dt className="text-muted-foreground">
                    <span aria-hidden>{getCurrencyFlag(currency)}</span> {currency} ·{" "}
                    {formatBucketCount(bucketCount)}
                  </dt>
                  <dd className="text-end font-semibold tabular-nums">
                    {formatMoney(amount, currency)}
                  </dd>
                </div>
              ))}
            </dl>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
