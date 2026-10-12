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
