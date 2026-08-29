import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";

import { getDB } from "#/db";
import { bankAccounts, transactions } from "#/db/schema";
import { authMiddleware } from "#/lib/middlewares";
import { verifyUserTransactionMiddlewareSchema } from "#/modules/transactions/schemas";

export const verifyUserTransactionMiddleware = createMiddleware({
  type: "function",
})
  .middleware([authMiddleware])
  .validator(verifyUserTransactionMiddlewareSchema)
  .server(async ({ next, context, data }) => {
    const db = getDB(env.db);

    const result = await db
      .select()
      .from(bankAccounts)
      .innerJoin(transactions, eq(bankAccounts.id, transactions.bankAccountId))
      .where(and(eq(transactions.id, data.transactionId), eq(bankAccounts.userId, context.user.id)))
      .limit(1);

    if (result.length === 0) throw new Error("No transaction is linked to this user");

    return next();
  });
