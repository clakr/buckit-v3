import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/modules/authentication/middlewares";

import { verifyUserDebtMiddlewareSchema } from "./schemas";

export const verifyUserDebtMiddleware = createMiddleware({
  type: "function",
})
  .middleware([authMiddleware])
  .validator(verifyUserDebtMiddlewareSchema)
  .server(async ({ next, context, data }) => {
    const db = getDB(env.db);

    const result = await db.query.debts.findFirst({
      where: {
        userId: context.userId,
        id: data.debtId,
      },
    });

    if (!result) throw new NotFoundError("This debt doesn't exist or may have been deleted.");

    return next();
  });
