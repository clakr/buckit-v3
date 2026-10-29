import { and, eq, exists, isNull, ne, notExists, or } from "drizzle-orm";

import type { DB } from "#/db";

import {
  distributionLines,
  distributions,
  type BankAccount,
  type Bucket,
  type Debt,
  type Distribution,
} from "#/db/schema";

export type DistributionDeletionImpact = {
  id: Distribution["id"];
  name: Distribution["name"];
  /** Deleted outright. Otherwise the Distribution only loses a line. */
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

/**
 * A Distribution needs at least one line, so removing a target's lines deletes the Distribution
 * when nothing else is left. The preview and the delete both build on this, so they can't disagree.
 */
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

/** A Bank Account's Distributions go with it through `ON DELETE CASCADE`. */
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

/**
 * Must run before the Bucket's delete in the same batch, because the delete's cascade removes the
 * lines that tell which Distributions are left empty. The other Distributions just lose the line
 * through the cascade.
 */
export function deleteDistributionsEmptiedByBucket(db: DB, bucketId: Bucket["id"]) {
  return db
    .delete(distributions)
    .where(hasOnlyLinesFor(db, { column: distributionLines.bucketId, id: bucketId }));
}

/** Must run before the Debt's delete in the same batch, for the reason above. */
export function deleteDistributionsEmptiedByDebt(db: DB, debtId: Debt["id"]) {
  return db
    .delete(distributions)
    .where(hasOnlyLinesFor(db, { column: distributionLines.debtId, id: debtId }));
}
