import type { DB } from "#/db";
import type { BankAccount, Debt } from "#/db/schema";

import { ConflictError, NotFoundError } from "#/lib/errors";

type LineTargetIds = { bucketIds: string[]; debtIds: string[] };

type LineDebt = Pick<Debt, "id" | "direction" | "currency">;

/**
 * A line's ids come from the request or from rows that may have outlived their targets, so save and
 * trigger both check that every Bucket and Debt is the User's and that each Debt is in the
 * Bank Account's currency. Returns the Debts, so a caller can tell a line's direction.
 */
export async function assertOwnedLineTargets(
  db: DB,
  userId: string,
  bankAccount: Pick<BankAccount, "currency">,
  { bucketIds, debtIds }: LineTargetIds,
): Promise<LineDebt[]> {
  const [ownedBuckets, ownedDebts] = await Promise.all([
    bucketIds.length
      ? db.query.buckets.findMany({
          where: { userId, id: { in: bucketIds } },
          columns: { id: true },
        })
      : [],
    debtIds.length
      ? db.query.debts.findMany({
          where: { userId, id: { in: debtIds } },
          columns: { id: true, direction: true, currency: true },
        })
      : [],
  ]);

  if (ownedBuckets.length !== bucketIds.length) {
    throw new NotFoundError("One of these buckets doesn't exist or may have been deleted.");
  }
  if (ownedDebts.length !== debtIds.length) {
    throw new NotFoundError("One of these debts doesn't exist or may have been deleted.");
  }
  if (ownedDebts.some((debt) => debt.currency !== bankAccount.currency)) {
    throw new ConflictError(
      `A distribution's debt lines must be in the bank account's currency (${bankAccount.currency}).`,
    );
  }

  return ownedDebts;
}
