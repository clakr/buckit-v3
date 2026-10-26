import { and, eq, getColumns, inArray, notInArray, sql, type SQL } from "drizzle-orm";

import type { DB } from "#/db";

import {
  allocations,
  bankAccounts,
  transactions,
  withdrawals,
  type Allocation,
  type BankAccount,
  type Transaction,
} from "#/db/schema";
import { NotFoundError } from "#/lib/errors";
import {
  getBankAccountFigures,
  type BankAccountFigures,
  type PendingAddition,
} from "#/modules/bank-accounts/utils";

export type BankAccountWithFigures = BankAccount &
  BankAccountFigures & { lastTransactionDate: Date | null };

export type BankAccountChange =
  | {
      kind: "add-transaction";
      bankAccountId: BankAccount["id"];
      type: Transaction["type"];
      amount: Transaction["amount"];
    }
  | {
      kind: "replace-transaction";
      transactionId: Transaction["id"];
      type: Transaction["type"];
      amount: Transaction["amount"];
    }
  | { kind: "remove-transactions"; transactionIds: Transaction["id"][] }
  | { kind: "add-allocation"; bankAccountId: BankAccount["id"]; amount: Allocation["amount"] }
  | { kind: "replace-allocation"; allocationId: Allocation["id"]; amount: Allocation["amount"] };

export type UnallocatedCheck =
  | { ok: true }
  | {
      ok: false;
      bankAccount: Pick<BankAccount, "id" | "name" | "currency">;
      available: number;
    };

// Correlate only through `eq()` inside `.where()`. In a single-table select, a column placed
// directly in a selected `sql` template loses its table name and binds to the inner table.
function sumTransactionAmounts(db: DB, type: Transaction["type"], excludedIds: string[]) {
  return db
    .select({ total: sql`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.bankAccountId, bankAccounts.id),
        eq(transactions.type, type),
        excludedIds.length ? notInArray(transactions.id, excludedIds) : undefined,
      ),
    );
}

function sumAllocationAmounts(db: DB, excludedIds: string[]) {
  return db
    .select({ total: sql`coalesce(sum(${allocations.amount}), 0)` })
    .from(allocations)
    .where(
      and(
        eq(allocations.bankAccountId, bankAccounts.id),
        excludedIds.length ? notInArray(allocations.id, excludedIds) : undefined,
      ),
    );
}

function sumWithdrawalAmounts(db: DB, excludedTransactionIds: string[]) {
  return db
    .select({ total: sql`coalesce(sum(${transactions.amount}), 0)` })
    .from(withdrawals)
    .innerJoin(transactions, eq(transactions.id, withdrawals.transactionId))
    .where(
      and(
        eq(transactions.bankAccountId, bankAccounts.id),
        excludedTransactionIds.length
          ? notInArray(transactions.id, excludedTransactionIds)
          : undefined,
      ),
    );
}

function getLatestTransactionDate(db: DB) {
  return db
    .select({ date: sql`max(${transactions.date})` })
    .from(transactions)
    .where(eq(transactions.bankAccountId, bankAccounts.id));
}

function loadBankAccountTotals(
  db: DB,
  {
    scope,
    excludeTransactionIds = [],
    excludeAllocationIds = [],
  }: { scope: SQL | undefined; excludeTransactionIds?: string[]; excludeAllocationIds?: string[] },
) {
  return db
    .select({
      ...getColumns(bankAccounts),
      incomeTotal:
        sql<number>`(${sumTransactionAmounts(db, "income", excludeTransactionIds)})`.mapWith(
          Number,
        ),
      expenseTotal:
        sql<number>`(${sumTransactionAmounts(db, "expense", excludeTransactionIds)})`.mapWith(
          Number,
        ),
      earmarkedTotal:
        sql<number>`(${sumAllocationAmounts(db, excludeAllocationIds)}) - (${sumWithdrawalAmounts(db, excludeTransactionIds)})`.mapWith(
          Number,
        ),
      lastTransactionDate: sql<Date | null>`(${getLatestTransactionDate(db)})`.mapWith(
        transactions.date,
      ),
    })
    .from(bankAccounts)
    .where(scope);
}

export async function getBankAccountsWithFigures(
  db: DB,
  {
    userId,
    bankAccountId,
    currency,
  }: { userId: string; bankAccountId?: BankAccount["id"]; currency?: BankAccount["currency"] },
): Promise<BankAccountWithFigures[]> {
  const rows = await loadBankAccountTotals(db, {
    scope: and(
      eq(bankAccounts.userId, userId),
      bankAccountId ? eq(bankAccounts.id, bankAccountId) : undefined,
      currency ? eq(bankAccounts.currency, currency) : undefined,
    ),
  });

  return rows.map(({ incomeTotal, expenseTotal, earmarkedTotal, ...bankAccount }) => ({
    ...bankAccount,
    ...getBankAccountFigures({
      startingBalance: bankAccount.startingBalance,
      incomeTotal,
      expenseTotal,
      earmarkedTotal,
    }),
  }));
}

type ChangeScope = {
  scope: SQL;
  excludeTransactionIds?: string[];
  excludeAllocationIds?: string[];
  pending: PendingAddition;
};

function describeChange(db: DB, change: BankAccountChange): ChangeScope {
  switch (change.kind) {
    case "add-transaction":
      return {
        scope: eq(bankAccounts.id, change.bankAccountId),
        pending: { transaction: { type: change.type, amount: change.amount } },
      };
    case "replace-transaction":
      return {
        scope: inArray(
          bankAccounts.id,
          db
            .select({ id: transactions.bankAccountId })
            .from(transactions)
            .where(eq(transactions.id, change.transactionId)),
        ),
        excludeTransactionIds: [change.transactionId],
        pending: { transaction: { type: change.type, amount: change.amount } },
      };
    case "remove-transactions":
      return {
        scope: inArray(
          bankAccounts.id,
          db
            .select({ id: transactions.bankAccountId })
            .from(transactions)
            .where(inArray(transactions.id, change.transactionIds)),
        ),
        excludeTransactionIds: change.transactionIds,
        pending: {},
      };
    case "add-allocation":
      return {
        scope: eq(bankAccounts.id, change.bankAccountId),
        pending: { allocationAmount: change.amount },
      };
    case "replace-allocation":
      return {
        scope: inArray(
          bankAccounts.id,
          db
            .select({ id: allocations.bankAccountId })
            .from(allocations)
            .where(eq(allocations.id, change.allocationId)),
        ),
        excludeAllocationIds: [change.allocationId],
        pending: { allocationAmount: change.amount },
      };
  }
}

function toTotals(row: Awaited<ReturnType<typeof loadBankAccountTotals>>[number]) {
  return {
    startingBalance: row.startingBalance,
    incomeTotal: row.incomeTotal,
    expenseTotal: row.expenseTotal,
    earmarkedTotal: row.earmarkedTotal,
  };
}

async function loadChangedFigures(db: DB, userId: string, change: BankAccountChange) {
  const { scope, excludeTransactionIds, excludeAllocationIds, pending } = describeChange(
    db,
    change,
  );

  const rows = await loadBankAccountTotals(db, {
    scope: and(eq(bankAccounts.userId, userId), scope),
    excludeTransactionIds,
    excludeAllocationIds,
  });

  if (!rows.length) throw new NotFoundError("This account doesn't exist or may have been deleted.");

  return rows.map((row) => ({
    bankAccount: { id: row.id, name: row.name, currency: row.currency },
    available: getBankAccountFigures(toTotals(row)).unallocated,
    after: getBankAccountFigures(toTotals(row), pending),
  }));
}

export async function checkUnallocated(
  db: DB,
  userId: string,
  change: BankAccountChange,
): Promise<UnallocatedCheck> {
  if (change.kind === "add-transaction" && change.type === "income") return { ok: true };
  if (change.kind === "remove-transactions" && !change.transactionIds.length) return { ok: true };

  const changed = await loadChangedFigures(db, userId, change);
  const shortfall = changed.find(({ after }) => after.unallocated < 0);

  if (shortfall) {
    return { ok: false, bankAccount: shortfall.bankAccount, available: shortfall.available };
  }

  return { ok: true };
}

export type BankAccountChangePreview = {
  bankAccount: Pick<BankAccount, "id" | "name" | "currency">;
  before: BankAccountFigures;
  after: BankAccountFigures;
}[];

export async function previewBankAccountChange(
  db: DB,
  userId: string,
  change: BankAccountChange,
): Promise<BankAccountChangePreview> {
  const [changed, current] = await Promise.all([
    loadChangedFigures(db, userId, change),
    loadBankAccountTotals(db, {
      scope: and(eq(bankAccounts.userId, userId), describeChange(db, change).scope),
    }),
  ]);

  return changed.map(({ bankAccount, after }) => {
    const row = current.find((account) => account.id === bankAccount.id);

    return {
      bankAccount,
      before: row ? getBankAccountFigures(toTotals(row)) : after,
      after,
    };
  });
}
