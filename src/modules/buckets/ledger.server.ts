import { eq } from "drizzle-orm";

import type { DB } from "#/db";
import type { LedgerPageRequest, LedgerPaging } from "#/lib/ledger-page";
import type { HeldMovement, HeldStep } from "#/modules/buckets/ledger";

import {
  allocations,
  bankAccounts,
  transactions,
  withdrawals,
  type BankAccount,
  type Bucket,
} from "#/db/schema";
import { getLedgerPage } from "#/lib/ledger-page";
import { replayHeld } from "#/modules/buckets/ledger";

export type BucketLedgerEntry = HeldMovement & {
  recordId: string;
  note: string | null;
  bankAccount: Pick<BankAccount, "id" | "name" | "currency">;
};

export type BucketLedgerPage = LedgerPaging & {
  entries: HeldStep<BucketLedgerEntry>[];
  opening: { currency: string; held: number }[];
  isOldestPage: boolean;
};

export function pageBucketLedger(
  ledger: BucketLedgerEntry[],
  request: LedgerPageRequest,
): BucketLedgerPage {
  const steps = replayHeld(ledger, (entry) => entry.bankAccount.currency).reverse();
  const { items, end, ...paging } = getLedgerPage(steps, request);

  const heldBeforePage = new Map<string, number>();
  for (const { bankAccount, held } of steps.slice(end)) {
    if (!heldBeforePage.has(bankAccount.currency)) heldBeforePage.set(bankAccount.currency, held);
  }

  return {
    ...paging,
    entries: items,
    opening: [...heldBeforePage]
      .map(([currency, held]) => ({ currency, held }))
      .sort((a, b) => a.currency.localeCompare(b.currency)),
    isOldestPage: end >= steps.length,
  };
}

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
