import type { z } from "zod";

import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { and, eq, ne } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";

import { getDB } from "#/db";
import { bankAccounts, lower } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { ConflictError, NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/lib/middlewares";
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
      userId: context.user.id,
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
        allocations: {
          with: {
            bucket: {
              columns: {
                name: true,
              },
            },
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
        userId: context.user.id,
        bankAccountId: data.bankAccountId,
      }),
    ]);

    // Deleted between the middleware's ownership check and this read.
    if (!bankAccount || !figures)
      throw new NotFoundError("This account doesn't exist or may have been deleted.");

    return {
      ...bankAccount,
      balance: figures.balance,
      unallocated: figures.unallocated,
      totalAllocated: figures.totalAllocated,
    };
  });

const NAME_TAKEN_MESSAGE = "An account with this name already exists.";

// Unique per user, case-insensitive, trimmed (the schemas trim). Renaming an account leaves its
// own current name out of the comparison.
async function checkBankAccountName(
  db: DB,
  userId: string,
  { name, bankAccountId }: z.output<typeof validateBankAccountNameSchema>,
) {
  const [taken] = await db
    .select({ id: bankAccounts.id })
    .from(bankAccounts)
    .where(
      and(
        eq(bankAccounts.userId, userId),
        eq(lower(bankAccounts.name), name.toLowerCase()),
        bankAccountId ? ne(bankAccounts.id, bankAccountId) : undefined,
      ),
    )
    .limit(1);

  if (taken) return { isValid: false, message: NAME_TAKEN_MESSAGE };

  return { isValid: true, message: "ok" };
}

// Two requests can both pass the check before either writes; the database's unique index then
// rejects the second, which reads the same as a failed check.
function isBankAccountNameTakenError(error: unknown) {
  for (let cause = error; cause instanceof Error; cause = cause.cause) {
    if (
      cause.message.includes("UNIQUE constraint failed") &&
      (cause.message.includes("bank_accounts_user_id_lower_name_unique") ||
        cause.message.includes("bank_accounts.name"))
    )
      return true;
  }

  return false;
}

export const validateBankAccountName = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(validateBankAccountNameSchema)
  .handler(async ({ context, data }) => checkBankAccountName(getDB(env.db), context.user.id, data));

export const registerBankAccount = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(registerBankAccountSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await checkBankAccountName(db, context.user.id, {
      name: data.name,
    });

    if (!isValid) throw new ConflictError(message);

    try {
      return await db
        .insert(bankAccounts)
        .values({
          id: uuidv7(),
          userId: context.user.id,
          name: data.name,
          currency: data.currency,
          startingBalance: currencyCodec.decode(data.startingBalance),
        })
        .returning();
    } catch (error) {
      if (isBankAccountNameTakenError(error)) throw new ConflictError(NAME_TAKEN_MESSAGE);

      throw error;
    }
  });

export const editBankAccount = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(editBankAccountSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await checkBankAccountName(db, context.user.id, data);

    if (!isValid) throw new ConflictError(message);

    try {
      return await db
        .update(bankAccounts)
        .set({
          name: data.name,
        })
        .where(eq(bankAccounts.id, data.bankAccountId))
        .returning();
    } catch (error) {
      if (isBankAccountNameTakenError(error)) throw new ConflictError(NAME_TAKEN_MESSAGE);

      throw error;
    }
  });

export const getBankAccountDeletionImpact = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware])
  .handler(async ({ context, data }) =>
    loadBankAccountDeletionImpact(getDB(env.db), context.user.id, data.bankAccountId),
  );

export const deleteBankAccount = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware])
  .handler(async ({ data }) => {
    const [, deleted] = await deleteBankAccountWithCascade(getDB(env.db), data.bankAccountId);

    return deleted;
  });
