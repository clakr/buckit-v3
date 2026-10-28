import type { Allocation, BankAccount, Transaction } from "#/db/schema";

export type BankAccountTotals = {
  startingBalance: BankAccount["startingBalance"];
  incomeTotal: number;
  expenseTotal: number;
  earmarkedTotal: number;
};

export type BankAccountFigures = {
  balance: number;
  unallocated: number;
  totalEarmarked: number;
};

export type PendingAddition = {
  transaction?: Pick<Transaction, "type" | "amount">;
  allocationAmount?: Allocation["amount"];
};

export function getBankAccountFigures(
  { startingBalance, incomeTotal, expenseTotal, earmarkedTotal }: BankAccountTotals,
  pending: PendingAddition = {},
): BankAccountFigures {
  const pendingTransactionAmount = !pending.transaction
    ? 0
    : pending.transaction.type === "income"
      ? pending.transaction.amount
      : -pending.transaction.amount;

  const balance = startingBalance + incomeTotal - expenseTotal + pendingTransactionAmount;
  const totalEarmarked = earmarkedTotal + (pending.allocationAmount ?? 0);

  return {
    balance,
    unallocated: balance - totalEarmarked,
    totalEarmarked,
  };
}

export const BALANCE_TREND_DAYS = 90;

const DAY_MS = 86_400_000;

export type BalanceTrend = {
  openingBalance: number;
  closingBalances: number[];
  net: number;
  hasActivity: boolean;
};

export function getBalanceTrendWindowStart(now: Date) {
  const startOfToday = Math.floor(now.getTime() / DAY_MS) * DAY_MS;

  return new Date(startOfToday - (BALANCE_TREND_DAYS - 1) * DAY_MS);
}

function getTrendDayIndexClampedToToday(date: Date, windowStart: number) {
  return Math.min(Math.floor((date.getTime() - windowStart) / DAY_MS), BALANCE_TREND_DAYS - 1);
}

export function getBalanceTrend({
  balance,
  transactions,
  now,
}: {
  balance: number;
  transactions: Pick<Transaction, "type" | "amount" | "date">[];
  now: Date;
}): BalanceTrend {
  const windowStart = getBalanceTrendWindowStart(now).getTime();
  const dayDeltas = Array.from({ length: BALANCE_TREND_DAYS }, () => 0);

  for (const { type, amount, date } of transactions) {
    const day = getTrendDayIndexClampedToToday(date, windowStart);
    dayDeltas[day] += type === "income" ? amount : -amount;
  }

  const closingBalances = Array.from({ length: BALANCE_TREND_DAYS }, () => balance);
  let runningBalance = balance;
  for (let day = BALANCE_TREND_DAYS - 1; day >= 0; day--) {
    closingBalances[day] = runningBalance;
    runningBalance -= dayDeltas[day];
  }

  return {
    openingBalance: runningBalance,
    closingBalances,
    net: balance - runningBalance,
    hasActivity: transactions.length > 0,
  };
}
