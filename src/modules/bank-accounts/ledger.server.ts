import { eq } from "drizzle-orm";

import type { DB } from "#/db";
import type { LedgerMovement } from "#/modules/bank-accounts/ledger";

import {
  allocations,
  buckets,
  debts,
  repayments,
  transactions,
  withdrawals,
  type BankAccount,
  type Bucket,
  type Debt,
  type Transaction,
} from "#/db/schema";

export type LedgerDebtLink = Pick<Debt, "id" | "name" | "direction"> & {
  role: "origination" | "repayment";
};

export type AccountLedgerEntry = LedgerMovement & {
  source: "transaction" | "allocation";
  note: string | null;
  bucket: Pick<Bucket, "id" | "name"> | null;
  debt: LedgerDebtLink | null;
};

export async function loadAccountLedger(
  db: DB,
  bankAccountId: BankAccount["id"],
): Promise<AccountLedgerEntry[]> {
  const debtColumns = { id: debts.id, name: debts.name, direction: debts.direction };

  const [transactionRows, allocationRows, repaymentLinks, originationLinks] = await Promise.all([
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        note: transactions.note,
        date: transactions.date,
        createdAt: transactions.createdAt,
        withdrawalId: withdrawals.id,
        bucketId: buckets.id,
        bucketName: buckets.name,
      })
      .from(transactions)
      .leftJoin(withdrawals, eq(withdrawals.transactionId, transactions.id))
      .leftJoin(buckets, eq(buckets.id, withdrawals.bucketId))
      .where(eq(transactions.bankAccountId, bankAccountId)),
    db
      .select({
        id: allocations.id,
        amount: allocations.amount,
        note: allocations.note,
        date: allocations.date,
        createdAt: allocations.createdAt,
        bucketId: buckets.id,
        bucketName: buckets.name,
      })
      .from(allocations)
      .innerJoin(buckets, eq(buckets.id, allocations.bucketId))
      .where(eq(allocations.bankAccountId, bankAccountId)),
    db
      .select({ transactionId: repayments.transactionId, ...debtColumns })
      .from(repayments)
      .innerJoin(debts, eq(debts.id, repayments.debtId))
      .innerJoin(transactions, eq(transactions.id, repayments.transactionId))
      .where(eq(transactions.bankAccountId, bankAccountId)),
    db
      .select({ transactionId: debts.originatingTransactionId, ...debtColumns })
      .from(debts)
      .innerJoin(transactions, eq(transactions.id, debts.originatingTransactionId))
      .where(eq(transactions.bankAccountId, bankAccountId)),
  ]);

  const debtByTransactionId = new Map<Transaction["id"], LedgerDebtLink>();
  for (const { transactionId, ...debt } of repaymentLinks) {
    if (transactionId) debtByTransactionId.set(transactionId, { ...debt, role: "repayment" });
  }
  for (const { transactionId, ...debt } of originationLinks) {
    if (transactionId) debtByTransactionId.set(transactionId, { ...debt, role: "origination" });
  }

  const transactionEntries = transactionRows.map(
    ({ type, withdrawalId, bucketId, bucketName, ...row }): AccountLedgerEntry => ({
      ...row,
      source: "transaction",
      kind: withdrawalId ? "withdrawal" : type,
      bucket: bucketId && bucketName ? { id: bucketId, name: bucketName } : null,
      debt: debtByTransactionId.get(row.id) ?? null,
    }),
  );

  const allocationEntries = allocationRows.map(
    ({ bucketId, bucketName, ...row }): AccountLedgerEntry => ({
      ...row,
      source: "allocation",
      kind: "allocation",
      bucket: { id: bucketId, name: bucketName },
      debt: null,
    }),
  );

  return [...transactionEntries, ...allocationEntries];
}
