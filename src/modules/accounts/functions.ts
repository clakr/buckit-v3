import { createServerFn } from "@tanstack/react-start";
import { Result } from "better-result";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

import { getDB } from "#/db";
import { bankAccounts, lower } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { authMiddleware } from "#/lib/middlewares";

import { addAccountSchema } from "./schemas";

// @todo: use native Error instead
export const getBankAccounts = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDB(env.db);

    const result = await Result.tryPromise({
      try: () =>
        db
          .select()
          .from(bankAccounts)
          .where(eq(bankAccounts.userId, context.user.id)),
      catch: (e) => e,
    });

    if (result.status === "error") {
      return Result.serialize(
        Result.err(
          result.error instanceof Error
            ? result.error.message
            : String(result.error),
        ),
      );
    }

    return Result.serialize(Result.ok(result.value));
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
