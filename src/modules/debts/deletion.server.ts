import type { DB } from "#/db";

import { type BankAccount, type Debt, type Transaction } from "#/db/schema";
import { NotFoundError } from "#/lib/errors";
import { previewBankAccountChange } from "#/modules/bank-accounts/figures.server";
import {
  loadDebtDistributionImpact,
  type DistributionDeletionImpact,
} from "#/modules/distributions/cleanup.server";

import { getDebtLinkedTransactionIds } from "./utils";

export type DebtDeletionImpact = {
  debt: Pick<Debt, "id" | "name">;
  repaymentCount: number;
  linkedTransactionIds: Transaction["id"][];
  distributions: DistributionDeletionImpact[];
  bankAccounts: {
    id: BankAccount["id"];
    name: BankAccount["name"];
    currency: BankAccount["currency"];
    balanceBefore: number;
    balanceAfter: number;
    unallocatedAfter: number;
  }[];
  shortfall: Pick<BankAccount, "id" | "name"> | null;
};

export async function loadDebtDeletionImpact(
  db: DB,
  userId: string,
  debtId: Debt["id"],
): Promise<DebtDeletionImpact> {
  const [debt, distributions] = await Promise.all([
    db.query.debts.findFirst({
      where: { id: debtId, userId },
      columns: { id: true, name: true, originatingTransactionId: true },
      with: { repayments: { columns: { transactionId: true } } },
    }),
    loadDebtDistributionImpact(db, userId, debtId),
  ]);

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
    distributions,
    bankAccounts: preview.map(({ bankAccount, before, after }) => ({
      ...bankAccount,
      balanceBefore: before.balance,
      balanceAfter: after.balance,
      unallocatedAfter: after.unallocated,
    })),
    shortfall:
      preview
        .filter(({ after, historyBreach }) => after.unallocated < 0 || historyBreach)
        .map(({ bankAccount }) => ({ id: bankAccount.id, name: bankAccount.name }))[0] ?? null,
  };
}
