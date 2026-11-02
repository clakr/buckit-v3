import { and, eq, exists, inArray, isNull, ne, notExists, or } from "drizzle-orm";

import type { DB } from "#/db";

import {
  buckets,
  debts,
  distributionLines,
  distributions,
  transactions,
  type BankAccount,
  type Bucket,
  type Debt,
  type Distribution,
  type Transaction,
} from "#/db/schema";

export type DistributionDeletionImpact = {
  id: Distribution["id"];
  name: Distribution["name"];
  isDeleted: boolean;
};

type LineTarget = {
  column: typeof distributionLines.bucketId | typeof distributionLines.debtId;
  id: Bucket["id"] | Debt["id"];
};

function hasLineFor(db: DB, { column, id }: LineTarget) {
  return exists(
    db
      .select({ id: distributionLines.id })
      .from(distributionLines)
      .where(and(eq(distributionLines.distributionId, distributions.id), eq(column, id))),
  );
}

function hasOnlyLinesFor(db: DB, target: LineTarget) {
  const { column, id } = target;

  return and(
    hasLineFor(db, target),
    notExists(
      db
        .select({ id: distributionLines.id })
        .from(distributionLines)
        .where(
          and(
            eq(distributionLines.distributionId, distributions.id),
            or(isNull(column), ne(column, id)),
          ),
        ),
    ),
  );
}

async function loadLineTargetImpact(
  db: DB,
  userId: string,
  target: LineTarget,
): Promise<DistributionDeletionImpact[]> {
  const [affected, deleted] = await Promise.all([
    db
      .select({ id: distributions.id, name: distributions.name })
      .from(distributions)
      .where(and(eq(distributions.userId, userId), hasLineFor(db, target)))
      .orderBy(distributions.name),
    db
      .select({ id: distributions.id })
      .from(distributions)
      .where(and(eq(distributions.userId, userId), hasOnlyLinesFor(db, target))),
  ]);

  const deletedIds = new Set(deleted.map((distribution) => distribution.id));

  return affected.map((distribution) => ({
    ...distribution,
    isDeleted: deletedIds.has(distribution.id),
  }));
}

export function loadBucketDistributionImpact(db: DB, userId: string, bucketId: Bucket["id"]) {
  return loadLineTargetImpact(db, userId, { column: distributionLines.bucketId, id: bucketId });
}

export function loadDebtDistributionImpact(db: DB, userId: string, debtId: Debt["id"]) {
  return loadLineTargetImpact(db, userId, { column: distributionLines.debtId, id: debtId });
}

export async function loadBankAccountDistributionImpact(
  db: DB,
  userId: string,
  bankAccountId: BankAccount["id"],
): Promise<DistributionDeletionImpact[]> {
  const rows = await db
    .select({ id: distributions.id, name: distributions.name })
    .from(distributions)
    .where(and(eq(distributions.userId, userId), eq(distributions.bankAccountId, bankAccountId)))
    .orderBy(distributions.name);

  return rows.map((distribution) => ({ ...distribution, isDeleted: true }));
}

function deleteDistributionsEmptiedBy(db: DB, target: LineTarget) {
  return db.delete(distributions).where(hasOnlyLinesFor(db, target));
}

export async function deleteBucketWithEmptiedDistributions(db: DB, bucketId: Bucket["id"]) {
  const [, deleted] = await db.batch([
    deleteDistributionsEmptiedBy(db, { column: distributionLines.bucketId, id: bucketId }),
    db.delete(buckets).where(eq(buckets.id, bucketId)).returning(),
  ]);

  return deleted;
}

export async function deleteDebtWithEmptiedDistributions(
  db: DB,
  debtId: Debt["id"],
  linkedTransactionIds: Transaction["id"][],
) {
  const deleteEmptiedDistributions = deleteDistributionsEmptiedBy(db, {
    column: distributionLines.debtId,
    id: debtId,
  });
  const deleteDebt = db.delete(debts).where(eq(debts.id, debtId)).returning();

  if (!linkedTransactionIds.length) {
    const [, deleted] = await db.batch([deleteEmptiedDistributions, deleteDebt]);

    return deleted;
  }

  const [, , deleted] = await db.batch([
    db.delete(transactions).where(inArray(transactions.id, linkedTransactionIds)),
    deleteEmptiedDistributions,
    deleteDebt,
  ]);

  return deleted;
}
