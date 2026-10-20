import { eq, inArray, type SQLWrapper } from "drizzle-orm";

import type { DB } from "#/db";

import { bankAccounts, type BankAccount } from "#/db/schema";

export function findOwnedBankAccount(
  db: DB,
  userId: string,
  bankAccountId: BankAccount["id"],
  { currency }: { currency?: BankAccount["currency"] } = {},
) {
  return db.query.bankAccounts.findFirst({
    where: { id: bankAccountId, userId, ...(currency ? { currency } : {}) },
    columns: { id: true, name: true, currency: true },
  });
}

export function isOwnedThroughBankAccount(db: DB, userId: string, bankAccountId: SQLWrapper) {
  return inArray(
    bankAccountId,
    db.select({ id: bankAccounts.id }).from(bankAccounts).where(eq(bankAccounts.userId, userId)),
  );
}
