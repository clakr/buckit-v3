import { IconChevronDown } from "@tabler/icons-react";

import type { BankAccount } from "#/db/schema";
import type { BalanceTrend, BankAccountFigures } from "#/modules/bank-accounts/utils";

import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { CURRENCIES } from "#/lib/constants";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { AccountStat } from "#/modules/bank-accounts/components/account-stat";
import { NetChangeAmount } from "#/modules/bank-accounts/components/net-change-cell";
import { BALANCE_TREND_DAYS } from "#/modules/bank-accounts/utils";

export type CurrencyTotals = BankAccountFigures & {
  currency: BankAccount["currency"];
  accountCount: number;
  net: number;
};

export function getCurrencyTotals(
  accounts: (Pick<BankAccount, "currency"> & BankAccountFigures & { trend: BalanceTrend })[],
) {
  const totalsByCurrency = new Map<BankAccount["currency"], CurrencyTotals>();
  for (const account of accounts) {
    const totals = totalsByCurrency.get(account.currency) ?? {
      currency: account.currency,
      accountCount: 0,
      balance: 0,
      unallocated: 0,
      totalEarmarked: 0,
      net: 0,
    };
    totals.accountCount += 1;
    totals.balance += account.balance;
    totals.unallocated += account.unallocated;
    totals.totalEarmarked += account.totalEarmarked;
    totals.net += account.trend.net;
    totalsByCurrency.set(account.currency, totals);
  }

  return [...totalsByCurrency.values()].sort(
    (a, b) => b.accountCount - a.accountCount || a.currency.localeCompare(b.currency),
  );
}

const OVERVIEW_TILE_LIMIT = 4;

function formatAccountCount(totals: CurrencyTotals) {
  return `${totals.currency} · ${totals.accountCount} ${totals.accountCount === 1 ? "account" : "accounts"}`;
}

export function AccountsOverview({ currencyTotals }: { currencyTotals: CurrencyTotals[] }) {
  const [onlyCurrency] = currencyTotals;
  if (!onlyCurrency) return null;

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
      <dl
        aria-label="Accounts overview"
        className="flex flex-wrap items-start gap-x-10 gap-y-3 max-sm:flex-nowrap max-sm:*:shrink-0"
      >
        {currencyTotals.length === 1 ? (
          <>
            <AccountStat
              label="Balance"
              value={onlyCurrency.balance}
              change={onlyCurrency.net}
              currency={onlyCurrency.currency}
            />
            <AccountStat
              label="Unallocated"
              value={onlyCurrency.unallocated}
              currency={onlyCurrency.currency}
            />
            <AccountStat
              label="Earmarked"
              value={onlyCurrency.totalEarmarked}
              currency={onlyCurrency.currency}
            />
          </>
        ) : (
          visibleTotals.map((totals) => (
            <AccountStat
              key={totals.currency}
              label={formatAccountCount(totals)}
              value={totals.balance}
              change={totals.net}
              currency={totals.currency}
            />
          ))
        )}
      </dl>
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
                  <dt className="text-muted-foreground">{formatAccountCount(totals)}</dt>
                  <dd className="flex flex-col items-end">
                    <span className="font-semibold tabular-nums">
                      {formatMoney(totals.balance, totals.currency)}
                    </span>
                    <NetChangeAmount net={totals.net} currency={totals.currency} />
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground">Change vs {BALANCE_TREND_DAYS} days ago</p>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
