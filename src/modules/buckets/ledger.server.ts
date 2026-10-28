import { eq } from "drizzle-orm";

import type { DB } from "#/db";
import type { HeldMovement } from "#/modules/buckets/ledger";

import {
  allocations,
  bankAccounts,
  transactions,
  withdrawals,
  type BankAccount,
  type Bucket,
} from "#/db/schema";

export type BucketLedgerEntry = HeldMovement & {
  recordId: string;
  note: string | null;
  bankAccount: Pick<BankAccount, "id" | "name" | "currency">;
};

export async function loadBucketLedger(
  db: DB,
  bucketId: Bucket["id"],
): Promise<BucketLedgerEntry[]> {
  const bankAccountColumns = {
    bankAccountId: bankAccounts.id,
    bankAccountName: bankAccounts.name,
    currency: bankAccounts.currency,
  };

  const [allocationRows, withdrawalRows] = await Promise.all([
    db
      .select({
        id: allocations.id,
        amount: allocations.amount,
        note: allocations.note,
        date: allocations.date,
        createdAt: allocations.createdAt,
        ...bankAccountColumns,
      })
      .from(allocations)
      .innerJoin(bankAccounts, eq(bankAccounts.id, allocations.bankAccountId))
      .where(eq(allocations.bucketId, bucketId)),
    db
      .select({
        id: transactions.id,
        withdrawalId: withdrawals.id,
        amount: transactions.amount,
        note: transactions.note,
        date: transactions.date,
        createdAt: transactions.createdAt,
        ...bankAccountColumns,
      })
      .from(withdrawals)
      .innerJoin(transactions, eq(transactions.id, withdrawals.transactionId))
      .innerJoin(bankAccounts, eq(bankAccounts.id, transactions.bankAccountId))
      .where(eq(withdrawals.bucketId, bucketId)),
  ]);

  return [
    ...allocationRows.map(
      ({ bankAccountId, bankAccountName, currency, ...row }): BucketLedgerEntry => ({
        ...row,
        kind: "allocation",
        recordId: row.id,
        bankAccount: { id: bankAccountId, name: bankAccountName, currency },
      }),
    ),
    ...withdrawalRows.map(
      ({ withdrawalId, bankAccountId, bankAccountName, currency, ...row }): BucketLedgerEntry => ({
        ...row,
        kind: "withdrawal",
        recordId: withdrawalId,
        bankAccount: { id: bankAccountId, name: bankAccountName, currency },
      }),
    ),
  ];
}
