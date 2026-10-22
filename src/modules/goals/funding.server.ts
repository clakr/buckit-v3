import type { DB } from "#/db";
import type { BankAccount } from "#/db/schema";

export function findFundingBankAccount(
  db: DB,
  { userId, currency }: { userId: string; currency: BankAccount["currency"] },
) {
  return db.query.bankAccounts.findFirst({
    columns: { id: true },
    where: { userId, currency },
  });
}
