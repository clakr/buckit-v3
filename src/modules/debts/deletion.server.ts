import type { DB } from "#/db";

import { type BankAccount, type Debt, type Transaction } from "#/db/schema";
import { NotFoundError } from "#/lib/errors";
import { previewBankAccountChange } from "#/modules/bank-accounts/figures.server";

import { getDebtLinkedTransactionIds } from "./utils";

export type DebtDeletionImpact = {
  debt: Pick<Debt, "id" | "name">;
  repaymentCount: number;
  linkedTransactionIds: Transaction["id"][];
  /** What also deleting the linked Transactions does to each account they moved money through. */
  bankAccounts: {
    id: BankAccount["id"];
    name: BankAccount["name"];
    currency: BankAccount["currency"];
    balanceBefore: number;
    balanceAfter: number;
    unallocatedAfter: number;
  }[];
  /** The first of those accounts whose Unallocated would go below zero; `deleteDebt` refuses. */
  shortfall: Pick<BankAccount, "id" | "name"> | null;
};

/**
 * What deleting a Debt takes with it (its repayments, by the FK cascade, and optionally every
 * Linked Transaction) and what that does to the accounts those Transactions moved money through.
 * `deleteDebt` reads the same impact, so the preview and the delete can't disagree.
 */
export async function loadDebtDeletionImpact(
  db: DB,
  userId: string,
  debtId: Debt["id"],
): Promise<DebtDeletionImpact> {
  const debt = await db.query.debts.findFirst({
    where: { id: debtId, userId },
    columns: { id: true, name: true, originatingTransactionId: true },
    with: { repayments: { columns: { transactionId: true } } },
  });

  if (!debt) throw new NotFoundError("This debt doesn't exist or may have been deleted.");

  const linkedTransactionIds = getDebtLinkedTransactionIds(debt);

  const preview = linkedTransactionIds.length
    ? await previewBankAccountChange(db, userId, {
        kind: "remove-transactions",
        transactionIds: linkedTransactionIds,
      })
    : [];

  return {
    debt: { id: debt.id, name: debt.name },
    repaymentCount: debt.repayments.length,
    linkedTransactionIds,
    bankAccounts: preview.map(({ bankAccount, before, after }) => ({
      ...bankAccount,
      balanceBefore: before.balance,
      balanceAfter: after.balance,
      unallocatedAfter: after.unallocated,
    })),
    shortfall:
      preview
        .filter(({ after }) => after.unallocated < 0)
        .map(({ bankAccount }) => ({ id: bankAccount.id, name: bankAccount.name }))[0] ?? null,
  };
}
