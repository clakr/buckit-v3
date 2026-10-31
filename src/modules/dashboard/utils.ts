import type { BankAccount, Debt } from "#/db/schema";
import type { BalanceTrend } from "#/modules/bank-accounts/utils";
import type { DebtStatus } from "#/modules/debts/figures.server";

import { BALANCE_TREND_DAYS } from "#/modules/bank-accounts/utils";

export const DEFAULT_DASHBOARD_CURRENCY: BankAccount["currency"] = "PHP";

export type CurrencySummary = {
  currency: BankAccount["currency"];
  balance: number;
  unallocated: number;
  earmarked: number;
  trend: BalanceTrend;
  receivableOutstanding: number;
  payableOutstanding: number;
};

type SummarizedBankAccount = Pick<BankAccount, "currency"> & {
  balance: number;
  unallocated: number;
  totalEarmarked: number;
  trend: BalanceTrend;
};

type SummarizedDebt = Pick<Debt, "currency" | "direction"> & {
  outstanding: number;
  status: DebtStatus;
};

export function createEmptySummary(currency: BankAccount["currency"]): CurrencySummary {
  return {
    currency,
    balance: 0,
    unallocated: 0,
    earmarked: 0,
    trend: {
      openingBalance: 0,
      closingBalances: Array.from({ length: BALANCE_TREND_DAYS }, () => 0),
      net: 0,
      hasActivity: false,
    },
    receivableOutstanding: 0,
    payableOutstanding: 0,
  };
}

function addTrend(total: BalanceTrend, trend: BalanceTrend): BalanceTrend {
  return {
    openingBalance: total.openingBalance + trend.openingBalance,
    closingBalances: total.closingBalances.map(
      (balance, day) => balance + trend.closingBalances[day],
    ),
    net: total.net + trend.net,
    hasActivity: total.hasActivity || trend.hasActivity,
  };
}

// Currencies are never converted, so every figure is summed within one currency only. Biggest
// Balance first (ties by currency code), which makes the first entry the default currency.
export function getCurrencySummaries(
  bankAccounts: SummarizedBankAccount[],
  debts: SummarizedDebt[],
): CurrencySummary[] {
  const summaryByCurrency = new Map<BankAccount["currency"], CurrencySummary>();

  function getOrCreateSummary(currency: BankAccount["currency"]) {
    const existing = summaryByCurrency.get(currency);
    if (existing) return existing;

    const created = createEmptySummary(currency);
    summaryByCurrency.set(currency, created);

    return created;
  }

  for (const bankAccount of bankAccounts) {
    const summary = getOrCreateSummary(bankAccount.currency);
    summary.balance += bankAccount.balance;
    summary.unallocated += bankAccount.unallocated;
    summary.earmarked += bankAccount.totalEarmarked;
    summary.trend = addTrend(summary.trend, bankAccount.trend);
  }

  for (const debt of debts) {
    if (debt.status !== "open") continue;

    const summary = getOrCreateSummary(debt.currency);
    if (debt.direction === "receivable") summary.receivableOutstanding += debt.outstanding;
    else summary.payableOutstanding += debt.outstanding;
  }

  return [...summaryByCurrency.values()].sort(
    (a, b) => b.balance - a.balance || a.currency.localeCompare(b.currency),
  );
}

export function selectCurrencySummary(
  summaries: CurrencySummary[],
  currency: BankAccount["currency"] | undefined,
) {
  return (
    summaries.find((summary) => summary.currency === currency) ??
    summaries[0] ??
    createEmptySummary(DEFAULT_DASHBOARD_CURRENCY)
  );
}
