import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { verifyUserWithdrawalMiddlewareSchema } from "#/modules/withdrawals/schemas";

export const verifyUserWithdrawalMiddleware = createMiddleware({
  type: "function",
})
  .middleware([authMiddleware])
  .validator(verifyUserWithdrawalMiddlewareSchema)
  .server(async ({ next, context, data }) => {
    const db = getDB(env.db);

    const result = await db.query.withdrawals.findFirst({
      columns: { id: true },
      where: {
        id: data.withdrawalId,
        bucket: { userId: context.userId },
      },
    });

    if (!result) throw new NotFoundError("This withdrawal doesn't exist or may have been deleted.");

    return next();
  });
