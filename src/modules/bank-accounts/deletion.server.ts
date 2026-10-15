import { count, eq, inArray } from "drizzle-orm";

import type { DB } from "#/db";

import { bankAccounts, debts, repayments, transactions, type BankAccount } from "#/db/schema";
import { NotFoundError } from "#/lib/errors";
import { getBucketsWithFigures } from "#/modules/buckets/figures.server";
import { getDebtOutstanding, getDebtStatus, type DebtStatus } from "#/modules/debts/utils";

// The cascade rules of a Bank Account delete, as SQL, so the preview and the delete read the
// same definition of what goes.

function selectBankAccountTransactionIds(db: DB, bankAccountId: BankAccount["id"]) {
  return db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.bankAccountId, bankAccountId));
}

// The FK cascade to `transactions` only nulls a repayment's `transactionId`, which would leave
// a row with no amount of its own. These are deleted instead, so the Debt's outstanding goes
// back up.
function isRemovedRepayment(db: DB, bankAccountId: BankAccount["id"]) {
  return inArray(repayments.transactionId, selectBankAccountTransactionIds(db, bankAccountId));
}

// An origination is left to the FK's `SET NULL`, so its Debt survives without a source account.
function isOrphanedDebt(db: DB, bankAccountId: BankAccount["id"]) {
  return inArray(
    debts.originatingTransactionId,
    selectBankAccountTransactionIds(db, bankAccountId),
  );
}

export function deleteBankAccountWithCascade(db: DB, bankAccountId: BankAccount["id"]) {
  return db.batch([
    db.delete(repayments).where(isRemovedRepayment(db, bankAccountId)),
    db.delete(bankAccounts).where(eq(bankAccounts.id, bankAccountId)).returning(),
  ]);
}

export type BankAccountDeletionImpact = {
  bankAccount: Pick<BankAccount, "id" | "name" | "currency">;
  transactionCount: number;
  allocationCount: number;
  removedRepaymentCount: number;
  /** Buckets holding money from this account; their balance in its currency drops. */
  buckets: { id: string; name: string; before: number; after: number }[];
  /** Debts linked through this account's Transactions. */
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

/** What deleting a Bank Account takes with it, and what survives but changes. */
export async function loadBankAccountDeletionImpact(
  db: DB,
  userId: string,
  bankAccountId: BankAccount["id"],
): Promise<BankAccountDeletionImpact> {
  const [bankAccount, [{ transactionCount }], removedRepayments, orphanedDebts, affectedBuckets] =
    await Promise.all([
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
      db.select({ id: debts.id }).from(debts).where(isOrphanedDebt(db, bankAccountId)),
      getBucketsWithFigures(db, { userId, allocatedFrom: bankAccountId }),
    ]);

  if (!bankAccount) throw new NotFoundError("This account doesn't exist or may have been deleted.");

  const removedRepaymentIds = new Set(removedRepayments.map((r) => r.id));
  const orphanedDebtIds = new Set(orphanedDebts.map((d) => d.id));
  const affectedDebtIds = [
    ...new Set([...removedRepayments.map((r) => r.debtId), ...orphanedDebtIds]),
  ];

  const affectedDebts = affectedDebtIds.length
    ? await db.query.debts.findMany({
        where: { userId, id: { in: affectedDebtIds } },
        columns: { id: true, name: true, currency: true, amount: true, forgivenAt: true },
        with: {
          repayments: {
            columns: { id: true, amount: true },
            with: { transaction: { columns: { amount: true } } },
          },
        },
      })
    : [];

  return {
    bankAccount: { id: bankAccount.id, name: bankAccount.name, currency: bankAccount.currency },
    transactionCount,
    allocationCount: bankAccount.allocations.length,
    removedRepaymentCount: removedRepaymentIds.size,
    // A Bucket can hold several currencies; only its balance in this account's currency moves.
    buckets: affectedBuckets.map((bucket) => {
      const before =
        bucket.subtotals.find((subtotal) => subtotal.currency === bankAccount.currency)?.amount ??
        0;
      const released =
        bucket.allocatedByBankAccount.find((allocated) => allocated.bankAccountId === bankAccountId)
          ?.amount ?? 0;

      return { id: bucket.id, name: bucket.name, before, after: before - released };
    }),
    debts: affectedDebts.map((debt) => {
      const debtAfter = {
        ...debt,
        repayments: debt.repayments.filter((r) => !removedRepaymentIds.has(r.id)),
      };

      return {
        id: debt.id,
        name: debt.name,
        currency: debt.currency,
        outstandingBefore: getDebtOutstanding(debt),
        outstandingAfter: getDebtOutstanding(debtAfter),
        statusBefore: getDebtStatus(debt),
        statusAfter: getDebtStatus(debtAfter),
        isOrphaned: orphanedDebtIds.has(debt.id),
      };
    }),
  };
}
