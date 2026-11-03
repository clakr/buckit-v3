import { IconArrowDownLeft, IconArrowUpRight, IconChevronDown } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isThisYear,
  isToday,
  isYesterday,
} from "date-fns";

import type { Debt } from "#/db/schema";
import type { getDebts } from "#/modules/debts/functions";

import { Stat } from "#/components/stat";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { CURRENCIES } from "#/lib/constants";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";

import { getDebtLastActivityTime } from "../columns";

type DebtRow = Awaited<ReturnType<typeof getDebts>>[number];

export type DebtCurrencyTotals = {
  currency: Debt["currency"];
  debtCount: number;
  receivableCount: number;
  payableCount: number;
  receivableOutstanding: number;
  payableOutstanding: number;
};

export function getDebtCurrencyTotals(
  debts: Pick<DebtRow, "currency" | "direction" | "status" | "outstanding">[],
) {
  const totalsByCurrency = new Map<Debt["currency"], DebtCurrencyTotals>();
  for (const { currency, direction, status, outstanding } of debts) {
    const totals = totalsByCurrency.get(currency) ?? {
      currency,
      debtCount: 0,
      receivableCount: 0,
      payableCount: 0,
      receivableOutstanding: 0,
      payableOutstanding: 0,
    };
    totals.debtCount += 1;
    if (status === "open" && direction === "receivable") {
      totals.receivableCount += 1;
      totals.receivableOutstanding += outstanding;
    }
    if (status === "open" && direction === "payable") {
      totals.payableCount += 1;
      totals.payableOutstanding += outstanding;
    }
    totalsByCurrency.set(currency, totals);
  }

  return [...totalsByCurrency.values()].sort(
    (a, b) => b.debtCount - a.debtCount || a.currency.localeCompare(b.currency),
  );
}

const VISIBLE_CURRENCY_LIMIT = 4;

const RECEIVABLE_TEXT = "text-emerald-600 dark:text-emerald-400";
const PAYABLE_TEXT = "text-amber-600 dark:text-amber-400";

function getCurrencyFlag(currency: Debt["currency"]) {
  return CURRENCIES.find(({ code }) => code === currency)?.flag;
}

function formatQuietDuration(date: Date) {
  if (differenceInCalendarDays(new Date(), date) < 1) return "Under a day";

  return formatDistanceToNowStrict(date, { roundingMethod: "floor" });
}

function formatRepaymentDay(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";

  return format(date, isThisYear(date) ? "MMM d" : "MMM d, yyyy");
}

type Props = {
  currencyTotals: DebtCurrencyTotals[];
  debts: Pick<DebtRow, "id" | "name" | "direction" | "status" | "date" | "lastRepaymentDate">[];
};

export function DebtsOverview({ currencyTotals, debts }: Props) {
  const balances = currencyTotals.filter(
    ({ receivableCount, payableCount }) => receivableCount + payableCount > 0,
  );

  if (!debts.length) return null;

  return (
    <div className="flex flex-col gap-y-3">
      {balances.length ? <BalanceSheet balances={balances} /> : null}
      <DebtTiles debts={debts} className={cn(balances.length && "border-t pt-3")} />
    </div>
  );
}

function BalanceSheet({ balances }: { balances: DebtCurrencyTotals[] }) {
  const visibleBalances =
    balances.length > VISIBLE_CURRENCY_LIMIT
      ? balances.slice(0, VISIBLE_CURRENCY_LIMIT - 1)
      : balances;
  const hiddenBalances = balances.slice(visibleBalances.length);

  return (
    <div className="flex flex-col gap-y-2">
      <ul
        aria-label="Balance per currency"
        className="grid gap-3 max-sm:-mx-4 max-sm:flex max-sm:snap-x max-sm:scroll-px-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:*:w-72 max-sm:*:shrink-0 max-sm:*:snap-start sm:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]"
      >
        {visibleBalances.map((balance) => (
          <BalanceRow key={balance.currency} balance={balance} />
        ))}
      </ul>
      {hiddenBalances.length ? (
        <Popover>
          <PopoverTrigger className="flex w-fit items-center gap-x-1 rounded-md border border-dashed px-2.5 py-1 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-expanded:bg-muted">
            +{hiddenBalances.length} more
            <span aria-hidden>
              {hiddenBalances.map(({ currency }) => getCurrencyFlag(currency)).join(" ")}
            </span>
            <IconChevronDown aria-hidden className="size-3.5" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto min-w-72">
            <dl
              aria-label="More currencies"
              className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-2"
            >
              <div className="col-span-3 grid grid-cols-subgrid text-xs text-muted-foreground">
                <dt>Currency</dt>
                <dd className="text-end">Owed to you</dd>
                <dd className="text-end">You owe</dd>
              </div>
              {hiddenBalances.map(({ currency, receivableOutstanding, payableOutstanding }) => (
                <div key={currency} className="col-span-3 grid grid-cols-subgrid">
                  <dt className="text-muted-foreground">
                    <span aria-hidden>{getCurrencyFlag(currency)}</span> {currency}
                  </dt>
                  <dd className={cn("text-end font-semibold tabular-nums", RECEIVABLE_TEXT)}>
                    {formatMoney(receivableOutstanding, currency)}
                  </dd>
                  <dd className={cn("text-end font-semibold tabular-nums", PAYABLE_TEXT)}>
                    {formatMoney(payableOutstanding, currency)}
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

function BalanceRow({ balance }: { balance: DebtCurrencyTotals }) {
  const { currency, receivableOutstanding, payableOutstanding, receivableCount, payableCount } =
    balance;
  const net = receivableOutstanding - payableOutstanding;
  const total = receivableOutstanding + payableOutstanding;
  const receivableShare = total === 0 ? 50 : (receivableOutstanding / total) * 100;

  return (
    <li className="flex flex-col gap-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-baseline justify-between gap-x-3 text-xs">
        <span className="font-medium">
          <span aria-hidden>{getCurrencyFlag(currency)}</span> {currency}
        </span>
        <span className="text-muted-foreground">
          Net{" "}
          <span
            className={cn(
              "font-semibold tabular-nums",
              net > 0 ? RECEIVABLE_TEXT : net < 0 ? PAYABLE_TEXT : "text-foreground",
            )}
          >
            {net > 0 ? "+" : ""}
            {formatMoney(net, currency)}
          </span>
        </span>
      </div>

      <div aria-hidden className="flex h-2 gap-x-0.5 overflow-hidden rounded-full">
        {receivableOutstanding > 0 ? (
          <div
            className="rounded-s-full bg-emerald-500 last:rounded-e-full dark:bg-emerald-400"
            style={{ width: `${receivableShare}%` }}
          />
        ) : null}
        {payableOutstanding > 0 ? (
          <div className="flex-1 rounded-e-full bg-amber-500 first:rounded-s-full dark:bg-amber-400" />
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-3">
        <div className="flex flex-col">
          <dt className={cn("flex items-center gap-x-0.5 text-xs", RECEIVABLE_TEXT)}>
            <IconArrowDownLeft aria-hidden className="size-3.5" />
            Owed to you
          </dt>
          <dd
            className={cn(
              "text-lg font-semibold whitespace-nowrap tabular-nums",
              receivableOutstanding === 0 && "text-muted-foreground",
            )}
          >
            {formatMoney(receivableOutstanding, currency)}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {receivableCount} open {receivableCount === 1 ? "debt" : "debts"}
          </dd>
        </div>
        <div className="flex flex-col items-end text-end">
          <dt className={cn("flex items-center gap-x-0.5 text-xs", PAYABLE_TEXT)}>
            You owe
            <IconArrowUpRight aria-hidden className="size-3.5" />
          </dt>
          <dd
            className={cn(
              "text-lg font-semibold whitespace-nowrap tabular-nums",
              payableOutstanding === 0 && "text-muted-foreground",
            )}
          >
            {formatMoney(payableOutstanding, currency)}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {payableCount} open {payableCount === 1 ? "debt" : "debts"}
          </dd>
        </div>
      </dl>
    </li>
  );
}

function DebtTiles({ debts, className }: { debts: Props["debts"]; className?: string }) {
  const openDebts = debts.filter(({ status }) => status === "open");
  const openReceivableCount = openDebts.filter(
    ({ direction }) => direction === "receivable",
  ).length;
  const closedCount = debts.length - openDebts.length;

  let quietestDebt: (typeof openDebts)[number] | null = null;
  for (const debt of openDebts)
    if (!quietestDebt || getDebtLastActivityTime(debt) < getDebtLastActivityTime(quietestDebt))
      quietestDebt = debt;

  let lastRepaidDebt: ((typeof debts)[number] & { lastRepaymentDate: Date }) | null = null;
  for (const debt of debts) {
    const { lastRepaymentDate } = debt;
    if (!lastRepaymentDate) continue;
    if (!lastRepaidDebt || lastRepaymentDate > lastRepaidDebt.lastRepaymentDate)
      lastRepaidDebt = { ...debt, lastRepaymentDate };
  }

  return (
    <dl
      aria-label="Debts overview"
      className={cn(
        "flex divide-x *:min-w-0 *:flex-1 *:px-4 *:first:ps-0 *:last:pe-0 max-sm:-mx-4 max-sm:snap-x max-sm:scroll-px-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:*:min-w-48 max-sm:*:shrink-0 max-sm:*:snap-start",
        className,
      )}
    >
      <Stat label="Open debts" value={openDebts.length}>
        <dd className="text-xs text-muted-foreground tabular-nums">
          {openDebts.length
            ? `${openReceivableCount} owed to you · ${openDebts.length - openReceivableCount} you owe`
            : `All ${closedCount} settled or forgiven`}
        </dd>
      </Stat>
      {quietestDebt ? (
        <Stat
          label="Quiet the longest"
          value={formatQuietDuration(new Date(getDebtLastActivityTime(quietestDebt)))}
        >
          <dd className="truncate text-xs text-muted-foreground">
            <DebtLink debt={quietestDebt}>{quietestDebt.name}</DebtLink>
            {quietestDebt.lastRepaymentDate ? " · since last repayment" : " · never repaid"}
          </dd>
        </Stat>
      ) : null}
      {lastRepaidDebt ? (
        <Stat label="Last repayment" value={formatRepaymentDay(lastRepaidDebt.lastRepaymentDate)}>
          <dd className="truncate text-xs text-muted-foreground">
            {lastRepaidDebt.direction === "receivable" ? (
              <>
                <DebtLink debt={lastRepaidDebt}>{lastRepaidDebt.name}</DebtLink> paid you
              </>
            ) : (
              <>
                You paid <DebtLink debt={lastRepaidDebt}>{lastRepaidDebt.name}</DebtLink>
              </>
            )}
          </dd>
        </Stat>
      ) : null}
    </dl>
  );
}

function DebtLink({ debt, children }: { debt: Pick<Debt, "id" | "name">; children: string }) {
  return (
    <Link
      to="/debts/$debtId"
      params={{ debtId: debt.id }}
      title={debt.name}
      className="underline decoration-dotted underline-offset-4 hover:text-foreground"
    >
      {children}
    </Link>
  );
}
