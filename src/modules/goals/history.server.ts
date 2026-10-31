import type { DB } from "#/db";
import type { Bucket, Goal } from "#/db/schema";

import { replayHeld } from "#/modules/buckets/ledger";
import { loadBucketLedger } from "#/modules/buckets/ledger.server";

export type GoalProgressPoint = { date: number; progress: number };

/** The Bucket's running balance in the Goal's currency after each Allocation and Withdrawal. */
export async function getGoalProgressHistory(
  db: DB,
  { bucketId, currency }: { bucketId: Bucket["id"]; currency: Goal["currency"] },
): Promise<GoalProgressPoint[]> {
  const ledger = await loadBucketLedger(db, bucketId);

  return replayHeld(ledger, (entry) => entry.bankAccount.currency)
    .filter((step) => step.bankAccount.currency === currency)
    .map((step) => ({ date: step.date.getTime(), progress: step.held }));
}
