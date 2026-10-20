import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { bankAccounts } from "#/db/schema";
import { ConflictError, NotFoundError } from "#/lib/errors";
import { createUniqueNameRule } from "#/lib/unique-name.server";
import { authMiddleware } from "#/modules/authentication/middlewares";
import {
  deleteBankAccountWithCascade,
  loadBankAccountDeletionImpact,
} from "#/modules/bank-accounts/deletion.server";
import { getBankAccountsWithFigures } from "#/modules/bank-accounts/figures.server";
import { verifyUserBankAccountMiddleware } from "#/modules/bank-accounts/middlewares";
import {
  editBankAccountSchema,
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
      with: {
        transactions: {
          with: {
            bankAccount: {
              columns: {
                currency: true,
              },
            },
          },
        },
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
      totalAllocated: figures.totalAllocated,
    };
  });

const bankAccountName = createUniqueNameRule({
  table: bankAccounts,
  indexName: "bank_accounts_user_id_lower_name_unique",
  takenMessage: "An account with this name already exists.",
});

export const validateBankAccountName = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(validateBankAccountNameSchema)
  .handler(async ({ context, data }) =>
    bankAccountName.check(getDB(env.db), context.userId, {
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

    const { isValid, message } = await bankAccountName.check(db, context.userId, {
      name: data.name,
    });

    if (!isValid) throw new ConflictError(message);

    return bankAccountName.write(
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

    const { isValid, message } = await bankAccountName.check(db, context.userId, {
      name: data.name,
      excludeId: data.bankAccountId,
    });

    if (!isValid) throw new ConflictError(message);

    return bankAccountName.write(
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
  .handler(async ({ data }) => {
    const [, deleted] = await deleteBankAccountWithCascade(getDB(env.db), data.bankAccountId);

    return deleted;
  });
