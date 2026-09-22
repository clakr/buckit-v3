import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { and, eq, ne } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

import { getDB } from "#/db";
import { bankAccounts, lower } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { authMiddleware } from "#/lib/middlewares";
import { verifyUserBankAccountMiddleware } from "#/modules/bank-accounts/middlewares";
import { addBankAccountSchema, editBankAccountSchema } from "#/modules/bank-accounts/schemas";

export const getBankAccounts = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDB(env.db);

    return db.query.bankAccounts.findMany({
      where: {
        userId: context.user.id,
      },
      with: {
        transactions: {
          orderBy: {
            date: "desc",
          },
          columns: {
            date: true,
            type: true,
            amount: true,
          },
        },
        allocations: {
          columns: {
            amount: true,
          },
        },
      },
    });
  });

export const getBankAccount = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware])
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const bankAccount = await db.query.bankAccounts.findFirst({
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

    return bankAccount ?? null;
  });

export const validateBankAccountName = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(z.string().trim())
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const result = await db
      .select({
        id: bankAccounts.id,
        name: bankAccounts.name,
      })
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.userId, context.session.userId),
          eq(lower(bankAccounts.name), data.toLowerCase()),
        ),
      )
      .limit(1);

    if (result.length > 0) {
      return {
        isValid: false,
        message: "An account with this name already exists.",
      };
    }

    return { isValid: true, message: "ok" };
  });

export const addBankAccount = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(addBankAccountSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await validateBankAccountName({
      data: data.name,
    });

    if (!isValid) throw new Error(message);

    return db
      .insert(bankAccounts)
      .values({
        id: uuidv7(),
        userId: context.session.userId,
        name: data.name,
        currency: data.currency,
        startingBalance: currencyCodec.decode(data.startingBalance),
      })
      .returning();
  });

export const validateEditBankAccountName = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(editBankAccountSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const result = await db
      .select({
        id: bankAccounts.id,
        name: bankAccounts.name,
      })
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.userId, context.session.userId),
          eq(lower(bankAccounts.name), data.name.toLowerCase()),
          ne(bankAccounts.id, data.bankAccountId),
        ),
      )
      .limit(1);

    if (result.length > 0) {
      return {
        isValid: false,
        message: "An account with this name already exists.",
      };
    }

    return { isValid: true, message: "ok" };
  });

export const editBankAccount = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(editBankAccountSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await validateEditBankAccountName({
      data,
    });

    if (!isValid) throw new Error(message);

    return db
      .update(bankAccounts)
      .set({
        name: data.name,
      })
      .where(eq(bankAccounts.id, data.bankAccountId))
      .returning();
  });

export const deleteBankAccount = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware])
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    return db.delete(bankAccounts).where(eq(bankAccounts.id, data.bankAccountId)).returning();
  });
