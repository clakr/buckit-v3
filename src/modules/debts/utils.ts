import type { Debt, Repayment } from "#/db/schema";

import { getRepaymentAmount } from "#/modules/repayments/utils";

export function getDebtOutstanding({
  amount,
  repayments,
}: {
  amount: Debt["amount"];
  repayments: Parameters<typeof getRepaymentAmount>[0][];
}) {
  const totalRepaid = repayments.reduce((acc, r) => acc + getRepaymentAmount(r), 0);

  return amount - totalRepaid;
}

// Computed on read, never stored — a stored status would go stale the moment a repayment
// disappears through an unrelated code path (e.g. a Bank Account deletion).
export type DebtStatus = "open" | "settled" | "forgiven";

export function getDebtStatus({
  amount,
  forgivenAt,
  repayments,
}: {
  amount: Debt["amount"];
  forgivenAt: Debt["forgivenAt"];
  repayments: Parameters<typeof getRepaymentAmount>[0][];
}): DebtStatus {
  if (forgivenAt) return "forgiven";

  return getDebtOutstanding({ amount, repayments }) <= 0 ? "settled" : "open";
}

// Every Transaction a Debt links to: its origination (if any) plus each repayment's.
export function getDebtLinkedTransactionIds({
  originatingTransactionId,
  repayments,
}: {
  originatingTransactionId: Debt["originatingTransactionId"];
  repayments: Pick<Repayment, "transactionId">[];
}) {
  return [originatingTransactionId, ...repayments.map((r) => r.transactionId)].filter(
    (id): id is string => id !== null,
  );
}
