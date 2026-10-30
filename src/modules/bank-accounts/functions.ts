import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { bankAccounts } from "#/db/schema";
import { ConflictError, NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { loadBankAccountDeletionImpact } from "#/modules/bank-accounts/deletion.server";
import {
  getBankAccountsWithFigures,
  getBankAccountsWithFiguresAndTrend,
} from "#/modules/bank-accounts/figures.server";
import { loadAccountLedgerPage } from "#/modules/bank-accounts/ledger.server";
import { verifyUserBankAccountMiddleware } from "#/modules/bank-accounts/middlewares";
import { bankAccountNameRule } from "#/modules/bank-accounts/name.server";
import {
  editBankAccountSchema,
  getBankAccountLedgerSchema,
  getBankAccountsSchema,
  registerBankAccountSchema,
  validateBankAccountNameSchema,
} from "#/modules/bank-accounts/schemas";

export const getBankAccounts = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(getBankAccountsSchema)
  .handler(async ({ context, data }) =>
    getBankAccountsWithFigures(getDB(env.db), {
      userId: context.userId,
      currency: data?.currency,
    }),
  );

export const getBankAccountsWithTrend = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    getBankAccountsWithFiguresAndTrend(getDB(env.db), { userId: context.userId }),
  );

export const getBankAccount = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware])
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const bankAccountQuery = db.query.bankAccounts.findFirst({
      where: {
        id: data.bankAccountId,
      },
    });

    const [bankAccount, [figures]] = await Promise.all([
      bankAccountQuery,
      getBankAccountsWithFigures(db, {
        userId: context.userId,
        bankAccountId: data.bankAccountId,
      }),
    ]);

    if (!bankAccount || !figures)
      throw new NotFoundError("This account doesn't exist or may have been deleted.");

    return {
      ...bankAccount,
      balance: figures.balance,
      unallocated: figures.unallocated,
      totalEarmarked: figures.totalEarmarked,
    };
  });

export const getBankAccountLedger = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(getBankAccountLedgerSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const bankAccount = await db.query.bankAccounts.findFirst({
      where: { id: data.bankAccountId },
      columns: { id: true, startingBalance: true },
    });

    if (!bankAccount)
      throw new NotFoundError("This account doesn't exist or may have been deleted.");

    return loadAccountLedgerPage(
      db,
      { bankAccountId: bankAccount.id, startingBalance: bankAccount.startingBalance },
      { pageIndex: data.pageIndex, pageSize: data.pageSize },
    );
  });

export const validateBankAccountName = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(validateBankAccountNameSchema)
  .handler(async ({ context, data }) =>
    bankAccountNameRule.check(getDB(env.db), context.userId, {
      name: data.name,
      excludeId: data.excludeId,
    }),
  );

export const registerBankAccount = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(registerBankAccountSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await bankAccountNameRule.check(db, context.userId, {
      name: data.name,
    });

    if (!isValid) throw new ConflictError(message);

    return bankAccountNameRule.write(
      db
        .insert(bankAccounts)
        .values({
          id: uuidv7(),
          userId: context.userId,
          name: data.name,
          currency: data.currency,
          startingBalance: data.startingBalance,
        })
        .returning(),
    );
  });

export const editBankAccount = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(editBankAccountSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await bankAccountNameRule.check(db, context.userId, {
      name: data.name,
      excludeId: data.bankAccountId,
    });

    if (!isValid) throw new ConflictError(message);

    return bankAccountNameRule.write(
      db
        .update(bankAccounts)
        .set({
          name: data.name,
        })
        .where(eq(bankAccounts.id, data.bankAccountId))
        .returning(),
    );
  });

export const getBankAccountDeletionImpact = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware])
  .handler(async ({ context, data }) =>
    loadBankAccountDeletionImpact(getDB(env.db), context.userId, data.bankAccountId),
  );

export const deleteBankAccount = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware])
  .handler(async ({ data }) =>
    getDB(env.db).delete(bankAccounts).where(eq(bankAccounts.id, data.bankAccountId)).returning(),
  );
