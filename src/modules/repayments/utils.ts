import type { Repayment, Transaction } from "#/db/schema";

export function getRepaymentAmount(repayment: {
  amount: Repayment["amount"];
  transaction: Pick<Transaction, "amount"> | null;
}) {
  return repayment.transaction?.amount ?? repayment.amount ?? 0;
}

export function getRepaymentDate(repayment: {
  date: Repayment["date"];
  transaction: Pick<Transaction, "date"> | null;
}) {
  return repayment.transaction?.date ?? repayment.date ?? undefined;
}
