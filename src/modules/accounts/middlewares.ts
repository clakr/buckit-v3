import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { authMiddleware } from "#/lib/middlewares";
import { verifyUserBankAccountMiddlewareSchema } from "#/modules/accounts/schemas";

export const verifyUserBankAccountMiddleware = createMiddleware({
  type: "function",
})
  .middleware([authMiddleware])
  .validator(verifyUserBankAccountMiddlewareSchema)
  .server(async ({ next, context, data }) => {
    const db = getDB(env.db);

    const result = await db.query.bankAccounts.findFirst({
      where: {
        userId: context.user.id,
        id: data.bankAccountId,
      },
    });

    if (!result) throw new Error("No bank account is linked to this user");

    return next();
  });
