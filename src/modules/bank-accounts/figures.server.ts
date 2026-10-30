import { and, eq, getColumns, gte, inArray, notInArray, or, sql, type SQL } from "drizzle-orm";

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
  findFirstBreach,
  replayLedger,
  type HistoryBreach,
  type LedgerMovement,
} from "#/modules/bank-accounts/ledger";
import {
  getBalanceTrend,
  getBalanceTrendWindowStart,
  getBankAccountFigures,
  type BalanceTrend,
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
      date: Transaction["date"];
    }
  | {
      kind: "replace-transaction";
      transactionId: Transaction["id"];
      type: Transaction["type"];
      amount: Transaction["amount"];
      date: Transaction["date"];
    }
  | { kind: "remove-transactions"; transactionIds: Transaction["id"][] }
  | {
      kind: "add-allocation";
      bankAccountId: BankAccount["id"];
      amount: Allocation["amount"];
      date: Allocation["date"];
    }
  | {
      kind: "replace-allocation";
      allocationId: Allocation["id"];
      amount: Allocation["amount"];
      date: Allocation["date"];
    };

export type UnallocatedCheck =
  | { ok: true }
  | {
      ok: false;
      bankAccount: Pick<BankAccount, "id" | "name" | "currency">;
      available: number;
      historyBreach: HistoryBreach | null;
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

export async function loadLedgerMovements(db: DB, bankAccountIds: BankAccount["id"][]) {
  const [transactionRows, allocationRows] = await Promise.all([
    db
      .select({
        id: transactions.id,
        bankAccountId: transactions.bankAccountId,
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
        createdAt: transactions.createdAt,
        withdrawalId: withdrawals.id,
      })
      .from(transactions)
      .leftJoin(withdrawals, eq(withdrawals.transactionId, transactions.id))
      .where(inArray(transactions.bankAccountId, bankAccountIds)),
    db
      .select({
        id: allocations.id,
        bankAccountId: allocations.bankAccountId,
        amount: allocations.amount,
        date: allocations.date,
        createdAt: allocations.createdAt,
      })
      .from(allocations)
      .where(inArray(allocations.bankAccountId, bankAccountIds)),
  ]);

  const movementsByBankAccountId = new Map<BankAccount["id"], LedgerMovement[]>();

  function push(bankAccountId: BankAccount["id"], movement: LedgerMovement) {
    const grouped = movementsByBankAccountId.get(bankAccountId) ?? [];
    grouped.push(movement);
    movementsByBankAccountId.set(bankAccountId, grouped);
  }

  for (const { bankAccountId, type, withdrawalId, ...row } of transactionRows) {
    push(bankAccountId, { ...row, kind: withdrawalId ? "withdrawal" : type });
  }

  for (const { bankAccountId, ...row } of allocationRows) {
    push(bankAccountId, { ...row, kind: "allocation" });
  }

  return movementsByBankAccountId;
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

export type BankAccountWithTrend = BankAccountWithFigures & { trend: BalanceTrend };

export async function getBankAccountsWithFiguresAndTrend(
  db: DB,
  { userId }: { userId: string },
): Promise<BankAccountWithTrend[]> {
  const now = new Date();

  const [bankAccountsWithFigures, windowTransactions] = await Promise.all([
    getBankAccountsWithFigures(db, { userId }),
    db
      .select({
        bankAccountId: transactions.bankAccountId,
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .innerJoin(bankAccounts, eq(bankAccounts.id, transactions.bankAccountId))
      .where(
        and(
          eq(bankAccounts.userId, userId),
          gte(transactions.date, getBalanceTrendWindowStart(now)),
        ),
      ),
  ]);

  const transactionsByBankAccountId = new Map<BankAccount["id"], typeof windowTransactions>();
  for (const transaction of windowTransactions) {
    const grouped = transactionsByBankAccountId.get(transaction.bankAccountId) ?? [];
    grouped.push(transaction);
    transactionsByBankAccountId.set(transaction.bankAccountId, grouped);
  }

  return bankAccountsWithFigures.map((bankAccount) => ({
    ...bankAccount,
    trend: getBalanceTrend({
      balance: bankAccount.balance,
      transactions: transactionsByBankAccountId.get(bankAccount.id) ?? [],
      now,
    }),
  }));
}

type PendingMovement = Pick<LedgerMovement, "kind" | "amount" | "date"> & {
  replacesId?: LedgerMovement["id"];
};

type ChangeScope = {
  scope: SQL;
  excludeTransactionIds?: string[];
  excludeAllocationIds?: string[];
  pending: PendingAddition;
  movement?: PendingMovement;
};

function describeChange(db: DB, change: BankAccountChange): ChangeScope {
  switch (change.kind) {
    case "add-transaction":
      return {
        scope: eq(bankAccounts.id, change.bankAccountId),
        pending: { transactions: [{ type: change.type, amount: change.amount }] },
        movement: { kind: change.type, amount: change.amount, date: change.date },
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
        pending: { transactions: [{ type: change.type, amount: change.amount }] },
        movement: {
          kind: change.type,
          amount: change.amount,
          date: change.date,
          replacesId: change.transactionId,
        },
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
        pending: { allocationAmounts: [change.amount] },
        movement: { kind: "allocation", amount: change.amount, date: change.date },
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
        pending: { allocationAmounts: [change.amount] },
        movement: {
          kind: "allocation",
          amount: change.amount,
          date: change.date,
          replacesId: change.allocationId,
        },
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

function applyChange(
  movements: LedgerMovement[],
  { excludeTransactionIds = [], excludeAllocationIds = [], movement }: ChangeScope,
) {
  const excludedIds = new Set([...excludeTransactionIds, ...excludeAllocationIds]);
  const kept = movements.filter(({ id }) => !excludedIds.has(id));
  if (!movement) return kept;

  const { replacesId, ...pending } = movement;
  const replaced = replacesId ? movements.find(({ id }) => id === replacesId) : undefined;

  return [
    ...kept,
    { ...pending, id: replacesId ?? "pending", createdAt: replaced?.createdAt ?? new Date() },
  ];
}

function findNewBreach(
  startingBalance: BankAccount["startingBalance"],
  before: LedgerMovement[],
  after: LedgerMovement[],
) {
  if (findFirstBreach(replayLedger(startingBalance, before))) return null;

  return findFirstBreach(replayLedger(startingBalance, after));
}

function appliesToBankAccount(
  change: BankAccountChange,
  bankAccountId: BankAccount["id"],
  movements: LedgerMovement[],
) {
  switch (change.kind) {
    case "add-transaction":
    case "add-allocation":
      return change.bankAccountId === bankAccountId;
    case "replace-transaction":
      return movements.some(({ id }) => id === change.transactionId);
    case "replace-allocation":
      return movements.some(({ id }) => id === change.allocationId);
    case "remove-transactions":
      return change.transactionIds.some((transactionId) =>
        movements.some(({ id }) => id === transactionId),
      );
  }
}

async function loadChangedFigures(db: DB, userId: string, changes: BankAccountChange[]) {
  const changeScopes = changes.map((change) => describeChange(db, change));

  const rows = await loadBankAccountTotals(db, {
    scope: and(eq(bankAccounts.userId, userId), or(...changeScopes.map(({ scope }) => scope))),
    excludeTransactionIds: changeScopes.flatMap(
      ({ excludeTransactionIds = [] }) => excludeTransactionIds,
    ),
    excludeAllocationIds: changeScopes.flatMap(
      ({ excludeAllocationIds = [] }) => excludeAllocationIds,
    ),
  });

  if (!rows.length) throw new NotFoundError("This account doesn't exist or may have been deleted.");

  const movementsByBankAccountId = await loadLedgerMovements(
    db,
    rows.map(({ id }) => id),
  );

  const appliedChangeIndexes = new Set<number>();

  const figures = rows.map((row) => {
    const movements = movementsByBankAccountId.get(row.id) ?? [];
    const applicable = changes.flatMap((change, index) => {
      if (!appliesToBankAccount(change, row.id, movements)) return [];

      appliedChangeIndexes.add(index);
      return [changeScopes[index]];
    });

    return {
      bankAccount: { id: row.id, name: row.name, currency: row.currency },
      available: getBankAccountFigures(toTotals(row)).unallocated,
      after: getBankAccountFigures(toTotals(row), {
        transactions: applicable.flatMap(({ pending }) => pending.transactions ?? []),
        allocationAmounts: applicable.flatMap(({ pending }) => pending.allocationAmounts ?? []),
      }),
      historyBreach: findNewBreach(
        row.startingBalance,
        movements,
        applicable.reduce((current, changeScope) => applyChange(current, changeScope), movements),
      ),
    };
  });

  if (appliedChangeIndexes.size < changes.length)
    throw new NotFoundError("This account doesn't exist or may have been deleted.");

  return figures;
}

export async function checkUnallocated(
  db: DB,
  userId: string,
  change: BankAccountChange | BankAccountChange[],
): Promise<UnallocatedCheck> {
  const changes = [change]
    .flat()
    .filter(
      (candidate) => candidate.kind !== "remove-transactions" || candidate.transactionIds.length,
    );
  if (
    changes.every(
      (candidate) => candidate.kind === "add-transaction" && candidate.type === "income",
    )
  )
    return { ok: true };

  const changed = await loadChangedFigures(db, userId, changes);
  const shortfall = changed.find(
    ({ after, historyBreach }) => after.unallocated < 0 || historyBreach,
  );

  if (shortfall) {
    return {
      ok: false,
      bankAccount: shortfall.bankAccount,
      available: shortfall.available,
      historyBreach: shortfall.after.unallocated < 0 ? null : shortfall.historyBreach,
    };
  }

  return { ok: true };
}

export type BankAccountChangePreview = {
  bankAccount: Pick<BankAccount, "id" | "name" | "currency">;
  before: BankAccountFigures;
  after: BankAccountFigures;
  historyBreach: HistoryBreach | null;
}[];

export async function previewBankAccountChange(
  db: DB,
  userId: string,
  change: BankAccountChange,
): Promise<BankAccountChangePreview> {
  const [changed, current] = await Promise.all([
    loadChangedFigures(db, userId, [change]),
    loadBankAccountTotals(db, {
      scope: and(eq(bankAccounts.userId, userId), describeChange(db, change).scope),
    }),
  ]);

  return changed.map(({ bankAccount, after, historyBreach }) => {
    const row = current.find((account) => account.id === bankAccount.id);

    return {
      bankAccount,
      before: row ? getBankAccountFigures(toTotals(row)) : after,
      after,
      historyBreach,
    };
  });
}
