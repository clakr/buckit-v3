import { eq, inArray, type SQLWrapper } from "drizzle-orm";

import type { DB } from "#/db";

import { bankAccounts, type BankAccount } from "#/db/schema";

// `userId` lives only on `bank_accounts`; Transactions and Allocations belong to a user through
// their Bank Account. This is the one place that rule is applied.

/** The user's Bank Account, optionally only if it's in `currency`. Someone else's reads as missing. */
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

/** For a row holding a `bankAccountId`: true when that Bank Account is the user's. */
export function isOwnedThroughBankAccount(db: DB, userId: string, bankAccountId: SQLWrapper) {
  return inArray(
    bankAccountId,
    db.select({ id: bankAccounts.id }).from(bankAccounts).where(eq(bankAccounts.userId, userId)),
  );
}
