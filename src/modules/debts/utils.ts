import type { BankAccount, Debt, Repayment } from "#/db/schema";

import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";
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

/**
 * Why a receivable's amount is more than its source account can lend, as the Record dialog shows
 * it before submitting and the write rejects it. `available` is in database amounts.
 */
export function describeInsufficientSourceAccount({
  bankAccount,
  available,
}: {
  bankAccount: Pick<BankAccount, "name" | "currency">;
  available: number;
}) {
  return `Insufficient unallocated balance in ${bankAccount.name} for this loan. Available: ${formatCurrency(
    currencyCodec.encode(available),
    { currency: bankAccount.currency },
  )}`;
}

/** Why deleting a Debt's linked Transactions is refused, in the Delete dialog and by the write. */
export function describeDeleteTransactionsShortfall(bankAccount: Pick<BankAccount, "name">) {
  return `Deleting the linked transactions would leave "${bankAccount.name}" with a negative unallocated balance. Adjust its allocations first, or keep the transactions.`;
}
