import type { BankAccount, Debt, Repayment, Transaction } from "#/db/schema";

/**
 * The type a Linked Transaction always has, fixed by its Debt: a receivable's origination is money
 * lent out; a repayment is money coming back on a receivable, or going out on a payable.
 */
export function getLinkedTransactionType(
  direction: Debt["direction"],
  kind: "origination" | "repayment",
): Transaction["type"] {
  if (kind === "origination") return "expense";

  return direction === "receivable" ? "income" : "expense";
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

/** Why deleting a Debt's linked Transactions is refused, in the Delete dialog and by the write. */
export function describeDeleteTransactionsShortfall(bankAccount: Pick<BankAccount, "name">) {
  return `Deleting the linked transactions would leave "${bankAccount.name}" with a negative unallocated balance. Adjust its allocations first, or keep the transactions.`;
}
