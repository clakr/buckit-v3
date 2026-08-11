import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

import { getDB } from "#/db";
import { bankAccounts, lower } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { authMiddleware } from "#/lib/middlewares";
import { addAccountSchema } from "#/modules/accounts/schemas";

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
            createdAt: "desc",
          },
        },
        allocations: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  });

export const validateBankAccountName = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(z.string())
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

    return result.length === 0;
  });

export const addBankAccount = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(addAccountSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

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

export const getBankAccount = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(z.string())
  .handler(async ({ data: bankAccountId }) => {
    const db = getDB(env.db);

    return db.query.bankAccounts.findFirst({
      where: {
        id: bankAccountId,
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
          orderBy: {
            date: "desc",
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
          orderBy: {
            date: "desc",
          },
        },
      },
    });
  });
