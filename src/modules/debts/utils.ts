import type { Debt } from "#/db/schema";
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
