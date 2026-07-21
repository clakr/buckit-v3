import type { Allocation, BankAccount, Transaction } from "#/db/schema";

export function getAccountUnallocatedBalance({
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

  const unallocated = balance - allocations.reduce((acc, a) => acc + a.amount, 0);

  return {
    balance,
    unallocated,
  };
}
