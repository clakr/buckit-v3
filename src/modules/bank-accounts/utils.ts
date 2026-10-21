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
