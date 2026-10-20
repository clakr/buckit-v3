import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";

import { getDB } from "#/db";
import { transactions } from "#/db/schema";
import { NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { isOwnedThroughBankAccount } from "#/modules/bank-accounts/ownership.server";
import { verifyUserTransactionMiddlewareSchema } from "#/modules/transactions/schemas";

export const verifyUserTransactionMiddleware = createMiddleware({
  type: "function",
})
  .middleware([authMiddleware])
  .validator(verifyUserTransactionMiddlewareSchema)
  .server(async ({ next, context, data }) => {
    const db = getDB(env.db);

    const [result] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.id, data.transactionId),
          isOwnedThroughBankAccount(db, context.userId, transactions.bankAccountId),
        ),
      )
      .limit(1);

    if (!result)
      throw new NotFoundError("This transaction doesn't exist or may have been deleted.");

    return next();
  });
