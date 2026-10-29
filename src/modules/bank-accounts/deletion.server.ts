import { count, eq, inArray } from "drizzle-orm";

import type { DB } from "#/db";

import { debts, repayments, transactions, withdrawals, type BankAccount } from "#/db/schema";
import { NotFoundError } from "#/lib/errors";
import { getBucketsWithFigures } from "#/modules/buckets/figures.server";
import {
  getDebtsWithFigures,
  withoutRepayments,
  type DebtStatus,
} from "#/modules/debts/figures.server";
import {
  loadBankAccountDistributionImpact,
  type DistributionDeletionImpact,
} from "#/modules/distributions/cleanup.server";
import { isRepaymentBackedBy } from "#/modules/transactions/linked.server";

function selectBankAccountTransactionIds(db: DB, bankAccountId: BankAccount["id"]) {
  return db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.bankAccountId, bankAccountId));
}

function isRemovedRepayment(db: DB, bankAccountId: BankAccount["id"]) {
  return isRepaymentBackedBy(selectBankAccountTransactionIds(db, bankAccountId));
}

function isRemovedWithdrawal(db: DB, bankAccountId: BankAccount["id"]) {
  return inArray(withdrawals.transactionId, selectBankAccountTransactionIds(db, bankAccountId));
}

function isOrphanedDebt(db: DB, bankAccountId: BankAccount["id"]) {
  return inArray(
    debts.originatingTransactionId,
    selectBankAccountTransactionIds(db, bankAccountId),
  );
}

export type BankAccountDeletionImpact = {
  bankAccount: Pick<BankAccount, "id" | "name" | "currency">;
  transactionCount: number;
  allocationCount: number;
  removedRepaymentCount: number;
  removedWithdrawalCount: number;
  distributions: DistributionDeletionImpact[];
  buckets: { id: string; name: string; before: number; after: number }[];
  debts: {
    id: string;
    name: string;
    currency: string;
    outstandingBefore: number;
    outstandingAfter: number;
    statusBefore: DebtStatus;
    statusAfter: DebtStatus;
    isOrphaned: boolean;
  }[];
};

export async function loadBankAccountDeletionImpact(
  db: DB,
  userId: string,
  bankAccountId: BankAccount["id"],
): Promise<BankAccountDeletionImpact> {
  const [
    bankAccount,
    [{ transactionCount }],
    removedRepayments,
    [{ removedWithdrawalCount }],
    orphanedDebts,
    affectedBuckets,
    distributions,
  ] = await Promise.all([
    db.query.bankAccounts.findFirst({
      where: { id: bankAccountId, userId },
      columns: { id: true, name: true, currency: true },
      with: { allocations: { columns: { id: true } } },
    }),
    db
      .select({ transactionCount: count() })
      .from(transactions)
      .where(eq(transactions.bankAccountId, bankAccountId)),
    db
      .select({ id: repayments.id, debtId: repayments.debtId })
      .from(repayments)
      .where(isRemovedRepayment(db, bankAccountId)),
    db
      .select({ removedWithdrawalCount: count() })
      .from(withdrawals)
      .where(isRemovedWithdrawal(db, bankAccountId)),
    db.select({ id: debts.id }).from(debts).where(isOrphanedDebt(db, bankAccountId)),
    getBucketsWithFigures(db, { userId, allocatedFrom: bankAccountId }),
    loadBankAccountDistributionImpact(db, userId, bankAccountId),
  ]);

  if (!bankAccount) throw new NotFoundError("This account doesn't exist or may have been deleted.");

  const removedRepaymentIds = new Set(removedRepayments.map((r) => r.id));
  const orphanedDebtIds = new Set(orphanedDebts.map((d) => d.id));
  const affectedDebtIds = [
    ...new Set([...removedRepayments.map((r) => r.debtId), ...orphanedDebtIds]),
  ];

  const affectedDebts = affectedDebtIds.length
    ? await getDebtsWithFigures(db, { userId, debtIds: affectedDebtIds })
    : [];

  return {
    bankAccount: { id: bankAccount.id, name: bankAccount.name, currency: bankAccount.currency },
    transactionCount,
    allocationCount: bankAccount.allocations.length,
    removedRepaymentCount: removedRepaymentIds.size,
    removedWithdrawalCount,
    distributions,
    buckets: affectedBuckets.map((bucket) => {
      const before =
        bucket.subtotals.find((subtotal) => subtotal.currency === bankAccount.currency)?.amount ??
        0;
      const released =
        bucket.heldByBankAccount.find((held) => held.bankAccountId === bankAccountId)?.amount ?? 0;

      return { id: bucket.id, name: bucket.name, before, after: before - released };
    }),
    debts: affectedDebts.map((debt) => {
      const debtAfter = withoutRepayments(debt, removedRepaymentIds);

      return {
        id: debt.id,
        name: debt.name,
        currency: debt.currency,
        outstandingBefore: debt.outstanding,
        outstandingAfter: debtAfter.outstanding,
        statusBefore: debt.status,
        statusAfter: debtAfter.status,
        isOrphaned: orphanedDebtIds.has(debt.id),
      };
    }),
  };
}
