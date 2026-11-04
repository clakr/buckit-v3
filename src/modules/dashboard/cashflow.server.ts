import { and, eq, gte, isNull } from "drizzle-orm";

import type { DB } from "#/db";

import { bankAccounts, debts, repayments, transactions, type BankAccount } from "#/db/schema";

import { getCashflow, getCashflowWindowStart, type Cashflow } from "./utils";

export async function getCashflowByCurrency(db: DB, { userId }: { userId: string }) {
  const now = new Date();
  const isEarnedOrSpent = and(isNull(repayments.id), isNull(debts.id));

  const windowTransactions = await db
    .select({
      currency: bankAccounts.currency,
      type: transactions.type,
      amount: transactions.amount,
      date: transactions.date,
    })
    .from(transactions)
    .innerJoin(bankAccounts, eq(bankAccounts.id, transactions.bankAccountId))
    .leftJoin(repayments, eq(repayments.transactionId, transactions.id))
    .leftJoin(debts, eq(debts.originatingTransactionId, transactions.id))
    .where(
      and(
        eq(bankAccounts.userId, userId),
        gte(transactions.date, new Date(getCashflowWindowStart(now))),
        isEarnedOrSpent,
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
