import { and, eq, isNull, lte, sql, type AnyColumn } from "drizzle-orm";

import type { DB } from "#/db";

import {
  allocations,
  bankAccounts,
  buckets,
  repayments,
  transactions,
  withdrawals,
  type BankAccount,
} from "#/db/schema";

import { RECENT_MOVEMENTS_LIMIT, type RecentMovement } from "./utils";

function rankNewestPerCurrency(date: AnyColumn, createdAt: AnyColumn) {
  return sql<number>`row_number() over (partition by ${bankAccounts.currency} order by ${date} desc, ${createdAt} desc)`;
}

export async function getRecentLedgerMovements(db: DB, { userId }: { userId: string }) {
  const isNotRepaymentTransaction = isNull(repayments.id);

  const rankedTransactions = db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      date: transactions.date,
      createdAt: transactions.createdAt,
      currency: bankAccounts.currency,
      bankAccountId: sql<string>`${bankAccounts.id}`.as("bank_account_id"),
      bankAccountName: sql<string>`${bankAccounts.name}`.as("bank_account_name"),
      withdrawalBucketId: sql<string | null>`${buckets.id}`.as("withdrawal_bucket_id"),
      withdrawalBucketName: sql<string | null>`${buckets.name}`.as("withdrawal_bucket_name"),
      rank: rankNewestPerCurrency(transactions.date, transactions.createdAt).as("rank"),
    })
    .from(transactions)
    .innerJoin(bankAccounts, eq(bankAccounts.id, transactions.bankAccountId))
    .leftJoin(repayments, eq(repayments.transactionId, transactions.id))
    .leftJoin(withdrawals, eq(withdrawals.transactionId, transactions.id))
    .leftJoin(buckets, eq(buckets.id, withdrawals.bucketId))
    .where(and(eq(bankAccounts.userId, userId), isNotRepaymentTransaction))
    .as("ranked_transactions");

  const rankedAllocations = db
    .select({
      id: allocations.id,
      amount: allocations.amount,
      date: allocations.date,
      createdAt: allocations.createdAt,
      currency: bankAccounts.currency,
      bucketId: sql<string>`${buckets.id}`.as("bucket_id"),
      bucketName: sql<string>`${buckets.name}`.as("bucket_name"),
      rank: rankNewestPerCurrency(allocations.date, allocations.createdAt).as("rank"),
    })
    .from(allocations)
    .innerJoin(bankAccounts, eq(bankAccounts.id, allocations.bankAccountId))
    .innerJoin(buckets, eq(buckets.id, allocations.bucketId))
    .where(and(eq(bankAccounts.userId, userId), eq(buckets.userId, userId)))
    .as("ranked_allocations");

  const [transactionRows, allocationRows] = await Promise.all([
    db
      .select()
      .from(rankedTransactions)
      .where(lte(rankedTransactions.rank, RECENT_MOVEMENTS_LIMIT)),
    db.select().from(rankedAllocations).where(lte(rankedAllocations.rank, RECENT_MOVEMENTS_LIMIT)),
  ]);

  const movementsByCurrency = new Map<BankAccount["currency"], RecentMovement[]>();

  function addMovement(currency: BankAccount["currency"], movement: RecentMovement) {
    const movements = movementsByCurrency.get(currency) ?? [];
    movements.push(movement);
    movementsByCurrency.set(currency, movements);
  }

  for (const { withdrawalBucketId, withdrawalBucketName, ...transaction } of transactionRows) {
    const withdrawalBucket =
      withdrawalBucketId !== null && withdrawalBucketName !== null
        ? { id: withdrawalBucketId, name: withdrawalBucketName }
        : null;

    addMovement(transaction.currency, {
      key: `transaction:${transaction.id}`,
      kind: withdrawalBucket ? "withdrawal" : transaction.type,
      flow: transaction.type === "income" ? "in" : "out",
      amount: transaction.amount,
      date: transaction.date,
      createdAt: transaction.createdAt,
      owner: withdrawalBucket
        ? { kind: "bucket", ...withdrawalBucket }
        : { kind: "bankAccount", id: transaction.bankAccountId, name: transaction.bankAccountName },
    });
  }

  for (const allocation of allocationRows) {
    addMovement(allocation.currency, {
      key: `allocation:${allocation.id}`,
      kind: "allocation",
      flow: null,
      amount: allocation.amount,
      date: allocation.date,
      createdAt: allocation.createdAt,
      owner: { kind: "bucket", id: allocation.bucketId, name: allocation.bucketName },
    });
  }

  return movementsByCurrency;
}
