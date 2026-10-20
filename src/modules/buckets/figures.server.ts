import { and, eq, inArray, sql, type SQL } from "drizzle-orm";

import type { DB } from "#/db";

import { allocations, bankAccounts, buckets, type BankAccount, type Bucket } from "#/db/schema";

export type BucketSubtotal = { currency: BankAccount["currency"]; amount: number };

export type BucketFigures = {
  subtotals: BucketSubtotal[];
  allocatedByBankAccount: {
    bankAccountId: BankAccount["id"];
    currency: BankAccount["currency"];
    amount: number;
  }[];
};

export type BucketWithFigures = Bucket & BucketFigures;

// Drizzle's `sum()` decodes to a string; amounts are integer cents, so Number is exact.
function sumAllocationsByBankAccount(db: DB, scope: SQL | undefined) {
  return db
    .select({
      bucketId: allocations.bucketId,
      bankAccountId: allocations.bankAccountId,
      currency: bankAccounts.currency,
      amount: sql<number>`sum(${allocations.amount})`.mapWith(Number),
    })
    .from(allocations)
    .innerJoin(buckets, eq(buckets.id, allocations.bucketId))
    .innerJoin(bankAccounts, eq(bankAccounts.id, allocations.bankAccountId))
    .where(scope)
    .groupBy(allocations.bucketId, allocations.bankAccountId);
}

function getSubtotals(allocatedByBankAccount: BucketFigures["allocatedByBankAccount"]) {
  const amountByCurrency = new Map<BankAccount["currency"], number>();
  for (const { currency, amount } of allocatedByBankAccount) {
    amountByCurrency.set(currency, (amountByCurrency.get(currency) ?? 0) + amount);
  }

  return [...amountByCurrency]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

export async function getBucketsWithFigures(
  db: DB,
  {
    userId,
    bucketId,
    allocatedFrom,
  }: { userId: string; bucketId?: Bucket["id"]; allocatedFrom?: BankAccount["id"] },
): Promise<BucketWithFigures[]> {
  const scope = and(
    eq(buckets.userId, userId),
    bucketId ? eq(buckets.id, bucketId) : undefined,
    allocatedFrom
      ? inArray(
          buckets.id,
          db
            .select({ id: allocations.bucketId })
            .from(allocations)
            .where(eq(allocations.bankAccountId, allocatedFrom)),
        )
      : undefined,
  );

  const [bucketRows, sums] = await Promise.all([
    db.select().from(buckets).where(scope),
    sumAllocationsByBankAccount(db, scope),
  ]);

  return bucketRows.map((bucket) => {
    const allocatedByBankAccount = sums
      .filter((row) => row.bucketId === bucket.id)
      .map(({ bankAccountId, currency, amount }) => ({ bankAccountId, currency, amount }));

    return {
      ...bucket,
      subtotals: getSubtotals(allocatedByBankAccount),
      allocatedByBankAccount,
    };
  });
}
