import type { BankAccount, Debt, Repayment, Transaction } from "#/db/schema";

export function getLinkedTransactionType(
  direction: Debt["direction"],
  kind: "origination" | "repayment",
): Transaction["type"] {
  if (kind === "origination") return "expense";

  return direction === "receivable" ? "income" : "expense";
}

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

export function describeDeleteTransactionsShortfall(bankAccount: Pick<BankAccount, "name">) {
  return `Deleting the linked transactions would leave "${bankAccount.name}" with a negative unallocated balance. Adjust its allocations first, or keep the transactions.`;
}
