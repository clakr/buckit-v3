import { and, eq, getColumns, inArray, notInArray, sql, type SQL } from "drizzle-orm";

import type { DB } from "#/db";

import {
  allocations,
  bankAccounts,
  transactions,
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

/** A write about to happen, in database amounts. */
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
      /** Unallocated before the change's additions: what the change could have used. */
      available: number;
    };

// Correlate only through `eq()` inside `.where()`: a column placed directly in a selected `sql`
// template loses its table name in a single-table select, and would bind to the inner table.
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

function getLatestTransactionDate(db: DB) {
  return db
    .select({ date: sql`max(${transactions.date})` })
    .from(transactions)
    .where(eq(transactions.bankAccountId, bankAccounts.id));
}

// Drizzle's `sum()` decodes to a string, and SUM over no rows is NULL: hence coalesce + Number.
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
      allocatedTotal: sql<number>`(${sumAllocationAmounts(db, excludeAllocationIds)})`.mapWith(
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

  return rows.map(({ incomeTotal, expenseTotal, allocatedTotal, ...bankAccount }) => ({
    ...bankAccount,
    ...getBankAccountFigures({
      startingBalance: bankAccount.startingBalance,
      incomeTotal,
      expenseTotal,
      allocatedTotal,
    }),
  }));
}

type ChangeScope = {
  scope: SQL;
  excludeTransactionIds?: string[];
  excludeAllocationIds?: string[];
  pending: PendingAddition;
};

// Which Bank Accounts a change touches, which existing rows it replaces or removes, and what
// it adds on top.
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

/**
 * Whether a change keeps Unallocated at or above zero on every Bank Account it touches.
 * `userId` scopes the lookup, so a caller can't learn whether someone else's account can afford
 * an amount.
 */
export async function checkUnallocated(
  db: DB,
  userId: string,
  change: BankAccountChange,
): Promise<UnallocatedCheck> {
  // Income only ever raises Unallocated.
  if (change.kind === "add-transaction" && change.type === "income") return { ok: true };
  if (change.kind === "remove-transactions" && !change.transactionIds.length) return { ok: true };

  const { scope, excludeTransactionIds, excludeAllocationIds, pending } = describeChange(
    db,
    change,
  );

  const rows = await loadBankAccountTotals(db, {
    scope: and(eq(bankAccounts.userId, userId), scope),
    excludeTransactionIds,
    excludeAllocationIds,
  });

  // Missing and someone else's look the same, and neither may pass as affordable.
  if (!rows.length) throw new NotFoundError("This account doesn't exist or may have been deleted.");

  for (const row of rows) {
    const totals = {
      startingBalance: row.startingBalance,
      incomeTotal: row.incomeTotal,
      expenseTotal: row.expenseTotal,
      allocatedTotal: row.allocatedTotal,
    };

    if (getBankAccountFigures(totals, pending).unallocated < 0) {
      return {
        ok: false,
        bankAccount: { id: row.id, name: row.name, currency: row.currency },
        available: getBankAccountFigures(totals).unallocated,
      };
    }
  }

  return { ok: true };
}
