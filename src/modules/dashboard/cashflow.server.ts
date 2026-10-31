import { and, eq, gte } from "drizzle-orm";

import type { DB } from "#/db";

import { bankAccounts, transactions, type BankAccount } from "#/db/schema";

import { getCashflow, getCashflowWindowStart, type Cashflow } from "./utils";

// Income and expense per month, one currency at a time since they are never converted. Every
// Transaction counts, so the totals match the Account ledgers: a Withdrawal's Linked Transaction is
// an expense, and a Debt origination is an ordinary Transaction there too.
export async function getCashflowByCurrency(db: DB, { userId }: { userId: string }) {
  const now = new Date();

  const windowTransactions = await db
    .select({
      currency: bankAccounts.currency,
      type: transactions.type,
      amount: transactions.amount,
      date: transactions.date,
    })
    .from(transactions)
    .innerJoin(bankAccounts, eq(bankAccounts.id, transactions.bankAccountId))
    .where(
      and(
        eq(bankAccounts.userId, userId),
        gte(transactions.date, new Date(getCashflowWindowStart(now))),
      ),
    );

  const transactionsByCurrency = new Map<BankAccount["currency"], typeof windowTransactions>();
  for (const transaction of windowTransactions) {
    const currencyTransactions = transactionsByCurrency.get(transaction.currency) ?? [];
    currencyTransactions.push(transaction);
    transactionsByCurrency.set(transaction.currency, currencyTransactions);
  }

  return new Map<BankAccount["currency"], Cashflow>(
    [...transactionsByCurrency].map(([currency, currencyTransactions]) => [
      currency,
      getCashflow(currencyTransactions, now),
    ]),
  );
}
