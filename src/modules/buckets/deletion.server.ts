import { count, eq } from "drizzle-orm";

import type { DB } from "#/db";

import { allocations, type BankAccount, type Bucket } from "#/db/schema";
import { NotFoundError } from "#/lib/errors";
import { getBankAccountsWithFigures } from "#/modules/bank-accounts/figures.server";
import { getBucketsWithFigures } from "#/modules/buckets/figures.server";

export type BucketDeletionImpact = {
  bucket: Pick<Bucket, "id" | "name">;
  allocationCount: number;
  bankAccounts: {
    id: BankAccount["id"];
    name: BankAccount["name"];
    currency: BankAccount["currency"];
    unallocatedBefore: number;
    unallocatedAfter: number;
  }[];
};

export async function loadBucketDeletionImpact(
  db: DB,
  userId: string,
  bucketId: Bucket["id"],
): Promise<BucketDeletionImpact> {
  const [[bucket], [{ allocationCount }], userBankAccounts] = await Promise.all([
    getBucketsWithFigures(db, { userId, bucketId }),
    db
      .select({ allocationCount: count() })
      .from(allocations)
      .where(eq(allocations.bucketId, bucketId)),
    getBankAccountsWithFigures(db, { userId }),
  ]);

  if (!bucket) throw new NotFoundError("This bucket doesn't exist or may have been deleted.");

  const releasedByBankAccountId = new Map(
    bucket.allocatedByBankAccount.map((allocated) => [allocated.bankAccountId, allocated.amount]),
  );

  return {
    bucket: { id: bucket.id, name: bucket.name },
    allocationCount,
    bankAccounts: userBankAccounts
      .filter((bankAccount) => releasedByBankAccountId.has(bankAccount.id))
      .map((bankAccount) => ({
        id: bankAccount.id,
        name: bankAccount.name,
        currency: bankAccount.currency,
        unallocatedBefore: bankAccount.unallocated,
        unallocatedAfter:
          bankAccount.unallocated + (releasedByBankAccountId.get(bankAccount.id) ?? 0),
      })),
  };
}
