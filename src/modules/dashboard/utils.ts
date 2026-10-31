import type { BankAccount, Bucket, Debt, Goal } from "#/db/schema";
import type { BalanceTrend } from "#/modules/bank-accounts/utils";
import type { DebtStatus } from "#/modules/debts/figures.server";

import { BALANCE_TREND_DAYS } from "#/modules/bank-accounts/utils";
import { getGoalStatus, type GoalStatus } from "#/modules/goals/utils";

export const DEFAULT_DASHBOARD_CURRENCY: BankAccount["currency"] = "PHP";

export type AccountBreakdown = {
  id: BankAccount["id"];
  name: BankAccount["name"];
  unallocated: number;
  earmarked: number;
};

export type GoalLane = {
  bucketId: Bucket["id"];
  bucketName: Bucket["name"];
  goal: Pick<Goal, "targetAmount" | "currency" | "targetDate"> & { progress: number };
};

export type OpenDebt = Pick<Debt, "id" | "name" | "direction" | "currency" | "amount"> & {
  outstanding: number;
  repaid: number;
};

export type CurrencySummary = {
  currency: BankAccount["currency"];
  balance: number;
  unallocated: number;
  earmarked: number;
  trend: BalanceTrend;
  accounts: AccountBreakdown[];
  receivableOutstanding: number;
  payableOutstanding: number;
  goalLanes: GoalLane[];
  openDebts: OpenDebt[];
};

type SummarizedBankAccount = Pick<BankAccount, "id" | "name" | "currency"> & {
  balance: number;
  unallocated: number;
  totalEarmarked: number;
  trend: BalanceTrend;
};

type SummarizedDebt = Pick<Debt, "id" | "name" | "currency" | "direction" | "amount"> & {
  outstanding: number;
  repaid: number;
  status: DebtStatus;
};

type SummarizedBucket = Pick<Bucket, "id" | "name"> & {
  goal: GoalLane["goal"] | null;
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
    accounts: [],
    receivableOutstanding: 0,
    payableOutstanding: 0,
    goalLanes: [],
    openDebts: [],
  };
}

const GOAL_STATUS_ORDER = {
  overdue: 0,
  "in progress": 1,
  reached: 2,
} satisfies Record<GoalStatus, number>;

// Overdue first, then nearest target date (no date last). Reached Goals sink to the bottom,
// since nothing is left to act on.
function compareGoalLanes(a: GoalLane, b: GoalLane) {
  return (
    GOAL_STATUS_ORDER[getGoalStatus(a.goal)] - GOAL_STATUS_ORDER[getGoalStatus(b.goal)] ||
    (a.goal.targetDate?.getTime() ?? Infinity) - (b.goal.targetDate?.getTime() ?? Infinity) ||
    a.bucketName.localeCompare(b.bucketName)
  );
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
  buckets: SummarizedBucket[],
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
    summary.accounts.push({
      id: bankAccount.id,
      name: bankAccount.name,
      unallocated: bankAccount.unallocated,
      earmarked: bankAccount.totalEarmarked,
    });
  }

  for (const debt of debts) {
    if (debt.status !== "open") continue;

    const summary = getOrCreateSummary(debt.currency);
    if (debt.direction === "receivable") summary.receivableOutstanding += debt.outstanding;
    else summary.payableOutstanding += debt.outstanding;

    summary.openDebts.push({
      id: debt.id,
      name: debt.name,
      direction: debt.direction,
      currency: debt.currency,
      amount: debt.amount,
      outstanding: debt.outstanding,
      repaid: debt.repaid,
    });
  }

  for (const bucket of buckets) {
    if (!bucket.goal) continue;

    getOrCreateSummary(bucket.goal.currency).goalLanes.push({
      bucketId: bucket.id,
      bucketName: bucket.name,
      goal: bucket.goal,
    });
  }

  for (const summary of summaryByCurrency.values()) {
    summary.accounts.sort(
      (a, b) =>
        b.unallocated + b.earmarked - (a.unallocated + a.earmarked) || a.name.localeCompare(b.name),
    );
    summary.goalLanes.sort(compareGoalLanes);
    summary.openDebts.sort((a, b) => b.outstanding - a.outstanding || a.name.localeCompare(b.name));
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
