import type { BankAccount, Debt, Repayment } from "#/db/schema";

import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";

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
