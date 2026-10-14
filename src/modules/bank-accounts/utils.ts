import type { Allocation, BankAccount, Transaction } from "#/db/schema";

export function getBankAccountUnallocatedBalance({
  startingBalance,
  transactions,
  allocations,
}: {
  startingBalance: BankAccount["startingBalance"];
  transactions: Pick<Transaction, "type" | "amount">[];
  allocations: Pick<Allocation, "amount">[];
}) {
  const balance =
    startingBalance +
    transactions.reduce((acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount), 0);

  const totalAllocated = allocations.reduce((acc, a) => acc + a.amount, 0);

  const unallocated = balance - totalAllocated;

  return {
    balance,
    unallocated,
    totalAllocated,
  };
}

export type BankAccountTotals = {
  startingBalance: BankAccount["startingBalance"];
  incomeTotal: number;
  expenseTotal: number;
  allocatedTotal: number;
};

export type BankAccountFigures = {
  balance: number;
  unallocated: number;
  totalAllocated: number;
};

/** Rows a pending change adds; rows it replaces or removes are left out of the totals instead. */
export type PendingAddition = {
  transaction?: Pick<Transaction, "type" | "amount">;
  allocationAmount?: Allocation["amount"];
};

export function getBankAccountFigures(
  { startingBalance, incomeTotal, expenseTotal, allocatedTotal }: BankAccountTotals,
  pending: PendingAddition = {},
): BankAccountFigures {
  const pendingTransactionAmount = !pending.transaction
    ? 0
    : pending.transaction.type === "income"
      ? pending.transaction.amount
      : -pending.transaction.amount;

  const balance = startingBalance + incomeTotal - expenseTotal + pendingTransactionAmount;
  const totalAllocated = allocatedTotal + (pending.allocationAmount ?? 0);

  return {
    balance,
    unallocated: balance - totalAllocated,
    totalAllocated,
  };
}
