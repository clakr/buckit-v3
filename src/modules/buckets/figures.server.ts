import { and, eq, inArray, sql, type SQL } from "drizzle-orm";

import type { DB } from "#/db";

import {
  allocations,
  bankAccounts,
  buckets,
  transactions,
  withdrawals,
  type BankAccount,
  type Bucket,
} from "#/db/schema";
import { NotFoundError } from "#/lib/errors";
import { findOwnedBankAccount } from "#/modules/bank-accounts/ownership.server";

export type BucketSubtotal = { currency: BankAccount["currency"]; amount: number };

export type BucketFigures = {
  subtotals: BucketSubtotal[];
  // Allocations from each Bank Account minus Withdrawals drawn from it.
  heldByBankAccount: {
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

function sumWithdrawalsByBankAccount(db: DB, scope: SQL | undefined) {
  return db
    .select({
      bucketId: withdrawals.bucketId,
      bankAccountId: transactions.bankAccountId,
      currency: bankAccounts.currency,
      amount: sql<number>`sum(${transactions.amount})`.mapWith(Number),
    })
    .from(withdrawals)
    .innerJoin(buckets, eq(buckets.id, withdrawals.bucketId))
    .innerJoin(transactions, eq(transactions.id, withdrawals.transactionId))
    .innerJoin(bankAccounts, eq(bankAccounts.id, transactions.bankAccountId))
    .where(scope)
    .groupBy(withdrawals.bucketId, transactions.bankAccountId);
}

function getSubtotals(heldByBankAccount: BucketFigures["heldByBankAccount"]) {
  const amountByCurrency = new Map<BankAccount["currency"], number>();
  for (const { currency, amount } of heldByBankAccount) {
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

  const [bucketRows, allocated, withdrawn] = await Promise.all([
    db.select().from(buckets).where(scope),
    sumAllocationsByBankAccount(db, scope),
    sumWithdrawalsByBankAccount(db, scope),
  ]);

  return bucketRows.map((bucket) => {
    // Keyed by Bank Account, so a pair with Withdrawals but no Allocations left still shows.
    const heldById = new Map<BankAccount["id"], BucketFigures["heldByBankAccount"][number]>();
    for (const row of allocated.filter((row) => row.bucketId === bucket.id)) {
      heldById.set(row.bankAccountId, {
        bankAccountId: row.bankAccountId,
        currency: row.currency,
        amount: row.amount,
      });
    }
    for (const row of withdrawn.filter((row) => row.bucketId === bucket.id)) {
      const held = heldById.get(row.bankAccountId);
      heldById.set(row.bankAccountId, {
        bankAccountId: row.bankAccountId,
        currency: row.currency,
        amount: (held?.amount ?? 0) - row.amount,
      });
    }
    const heldByBankAccount = [...heldById.values()];

    return {
      ...bucket,
      subtotals: getSubtotals(heldByBankAccount),
      heldByBankAccount,
    };
  });
}

export function getHeldFromBankAccount(
  bucket: Pick<BucketFigures, "heldByBankAccount">,
  bankAccountId: BankAccount["id"],
) {
  return bucket.heldByBankAccount.find((held) => held.bankAccountId === bankAccountId)?.amount ?? 0;
}

export type HeldCheck =
  | { ok: true }
  | {
      ok: false;
      bucket: Pick<Bucket, "id" | "name">;
      bankAccount: Pick<BankAccount, "id" | "name" | "currency">;
      available: number;
    };

// What a Bucket holds from one Bank Account can never go negative.
export async function checkHeld(
  db: DB,
  userId: string,
  {
    bucketId,
    bankAccountId,
    reduction,
  }: { bucketId: Bucket["id"]; bankAccountId: BankAccount["id"]; reduction: number },
): Promise<HeldCheck> {
  const [[bucket], bankAccount] = await Promise.all([
    getBucketsWithFigures(db, { userId, bucketId }),
    findOwnedBankAccount(db, userId, bankAccountId),
  ]);

  if (!bucket) throw new NotFoundError("This bucket doesn't exist or may have been deleted.");
  if (!bankAccount) throw new NotFoundError("This account doesn't exist or may have been deleted.");

  const available = getHeldFromBankAccount(bucket, bankAccountId);

  if (reduction > available) {
    return { ok: false, bucket: { id: bucket.id, name: bucket.name }, bankAccount, available };
  }

  return { ok: true };
}
