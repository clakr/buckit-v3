import type { Debt, Transaction } from "#/db/schema";

export function getDebtOutstanding({
  amount,
  repayments,
}: {
  amount: Debt["amount"];
  repayments: { transaction: Pick<Transaction, "amount"> | null }[];
}) {
  const totalRepaid = repayments.reduce((acc, r) => acc + (r.transaction?.amount ?? 0), 0);

  return amount - totalRepaid;
}
