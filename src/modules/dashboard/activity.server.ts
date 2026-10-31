import { sql } from "drizzle-orm";

import type { DB } from "#/db";
import type { BankAccount } from "#/db/schema";

import { repayments } from "#/db/schema";

import { RECENT_MOVEMENTS_LIMIT, type RecentMovement } from "./utils";

// The ledger side of the feed: Transactions and Allocations of one currency's Bank Accounts. Each
// currency is queried on its own so a busy currency can't push another one off its page of eight.
// A Transaction a Repayment is linked to is left out, because the Debt's Repayment stands in for it.
// Withdrawals and Debt originations stay in, as the ordinary Transactions they link to.
export async function getRecentLedgerMovements(
  db: DB,
  { userId, currencies }: { userId: string; currencies: BankAccount["currency"][] },
) {
  const movementsByCurrency = new Map<BankAccount["currency"], RecentMovement[]>();

  await Promise.all(
    currencies.map(async (currency) => {
      const [transactions, allocations] = await Promise.all([
        db.query.transactions.findMany({
          where: {
            bankAccount: { userId, currency },
            RAW: (transaction) =>
              sql`${transaction.id} NOT IN (SELECT ${repayments.transactionId} FROM ${repayments} WHERE ${repayments.transactionId} IS NOT NULL)`,
          },
          columns: { id: true, type: true, amount: true, date: true, createdAt: true },
          with: { bankAccount: { columns: { id: true, name: true } } },
          orderBy: { date: "desc", createdAt: "desc" },
          limit: RECENT_MOVEMENTS_LIMIT,
        }),
        db.query.allocations.findMany({
          where: { bankAccount: { userId, currency }, bucket: { userId } },
          columns: { id: true, amount: true, date: true, createdAt: true },
          with: { bucket: { columns: { id: true, name: true } } },
          orderBy: { date: "desc", createdAt: "desc" },
          limit: RECENT_MOVEMENTS_LIMIT,
        }),
      ]);

      movementsByCurrency.set(currency, [
        ...transactions.map(({ bankAccount, ...transaction }): RecentMovement => ({
          key: `transaction:${transaction.id}`,
          kind: transaction.type,
          flow: transaction.type === "income" ? "in" : "out",
          amount: transaction.amount,
          date: transaction.date,
          createdAt: transaction.createdAt,
          owner: { kind: "bankAccount", id: bankAccount.id, name: bankAccount.name },
        })),
        ...allocations.map(({ bucket, ...allocation }): RecentMovement => ({
          key: `allocation:${allocation.id}`,
          kind: "allocation",
          flow: null,
          amount: allocation.amount,
          date: allocation.date,
          createdAt: allocation.createdAt,
          owner: { kind: "bucket", id: bucket.id, name: bucket.name },
        })),
      ]);
    }),
  );

  return movementsByCurrency;
}
