import { and, eq, inArray } from "drizzle-orm";

import type { DB } from "#/db";
import type { LedgerPageRequest, LedgerPaging } from "#/lib/ledger-page";
import type { LedgerFigures, LedgerMovement, LedgerStep } from "#/modules/bank-accounts/ledger";

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
import { getLedgerPage } from "#/lib/ledger-page";
import { loadLedgerMovements } from "#/modules/bank-accounts/figures.server";
import { replayLedger } from "#/modules/bank-accounts/ledger";

export type LedgerDebtLink = Pick<Debt, "id" | "name" | "direction"> & {
  role: "origination" | "repayment";
};

type AccountLedgerDetails = {
  note: string | null;
  bucket: Pick<Bucket, "id" | "name"> | null;
  debt: LedgerDebtLink | null;
};

export type AccountLedgerEntry = LedgerMovement &
  AccountLedgerDetails & { source: "transaction" | "allocation" };

export type AccountLedgerPage = LedgerPaging & {
  entries: LedgerStep<AccountLedgerEntry>[];
  opening: LedgerFigures;
  isOldestPage: boolean;
};

export async function loadAccountLedgerPage(
  db: DB,
  {
    bankAccountId,
    startingBalance,
  }: Pick<BankAccount, "startingBalance"> & { bankAccountId: BankAccount["id"] },
  request: LedgerPageRequest,
): Promise<AccountLedgerPage> {
  const movementsByBankAccountId = await loadLedgerMovements(db, [bankAccountId]);
  const steps = replayLedger(
    startingBalance,
    movementsByBankAccountId.get(bankAccountId) ?? [],
  ).reverse();

  const { items, end, ...paging } = getLedgerPage(steps, request);
  const detailsById = await loadAccountLedgerDetails(db, bankAccountId, items);
  const olderStep = steps[end];

  return {
    ...paging,
    entries: items.map((step): LedgerStep<AccountLedgerEntry> => {
      const details = detailsById.get(step.id);

      return {
        ...step,
        source: step.kind === "allocation" ? "allocation" : "transaction",
        note: details?.note ?? null,
        bucket: details?.bucket ?? null,
        debt: details?.debt ?? null,
      };
    }),
    opening: olderStep
      ? { balance: olderStep.balance, unallocated: olderStep.unallocated }
      : { balance: startingBalance, unallocated: startingBalance },
    isOldestPage: !olderStep,
  };
}

async function loadAccountLedgerDetails(
  db: DB,
  bankAccountId: BankAccount["id"],
  movements: Pick<LedgerMovement, "id" | "kind">[],
): Promise<Map<string, AccountLedgerDetails>> {
  const allocationIds = movements.filter(({ kind }) => kind === "allocation").map(({ id }) => id);
  const transactionIds = movements.filter(({ kind }) => kind !== "allocation").map(({ id }) => id);

  const debtColumns = { id: debts.id, name: debts.name, direction: debts.direction };

  const [transactionRows, allocationRows, repaymentLinks, originationLinks] = await Promise.all([
    transactionIds.length
      ? db
          .select({
            id: transactions.id,
            note: transactions.note,
            bucketId: buckets.id,
            bucketName: buckets.name,
          })
          .from(transactions)
          .leftJoin(withdrawals, eq(withdrawals.transactionId, transactions.id))
          .leftJoin(buckets, eq(buckets.id, withdrawals.bucketId))
          .where(
            and(
              eq(transactions.bankAccountId, bankAccountId),
              inArray(transactions.id, transactionIds),
            ),
          )
      : [],
    allocationIds.length
      ? db
          .select({
            id: allocations.id,
            note: allocations.note,
            bucketId: buckets.id,
            bucketName: buckets.name,
          })
          .from(allocations)
          .innerJoin(buckets, eq(buckets.id, allocations.bucketId))
          .where(
            and(
              eq(allocations.bankAccountId, bankAccountId),
              inArray(allocations.id, allocationIds),
            ),
          )
      : [],
    transactionIds.length
      ? db
          .select({ transactionId: repayments.transactionId, ...debtColumns })
          .from(repayments)
          .innerJoin(debts, eq(debts.id, repayments.debtId))
          .where(inArray(repayments.transactionId, transactionIds))
      : [],
    transactionIds.length
      ? db
          .select({ transactionId: debts.originatingTransactionId, ...debtColumns })
          .from(debts)
          .where(inArray(debts.originatingTransactionId, transactionIds))
      : [],
  ]);

  const debtByTransactionId = new Map<Transaction["id"], LedgerDebtLink>();
  for (const { transactionId, ...debt } of repaymentLinks) {
    if (transactionId) debtByTransactionId.set(transactionId, { ...debt, role: "repayment" });
  }
  for (const { transactionId, ...debt } of originationLinks) {
    if (transactionId) debtByTransactionId.set(transactionId, { ...debt, role: "origination" });
  }

  const detailsById = new Map<string, AccountLedgerDetails>();

  for (const { id, note, bucketId, bucketName } of transactionRows) {
    detailsById.set(id, {
      note,
      bucket: bucketId && bucketName ? { id: bucketId, name: bucketName } : null,
      debt: debtByTransactionId.get(id) ?? null,
    });
  }

  for (const { id, note, bucketId, bucketName } of allocationRows) {
    detailsById.set(id, { note, bucket: { id: bucketId, name: bucketName }, debt: null });
  }

  return detailsById;
}
