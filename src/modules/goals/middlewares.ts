import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { verifyUserGoalMiddlewareSchema } from "#/modules/goals/schemas";

export const verifyUserGoalMiddleware = createMiddleware({
  type: "function",
})
  .middleware([authMiddleware])
  .validator(verifyUserGoalMiddlewareSchema)
  .server(async ({ next, context, data }) => {
    const db = getDB(env.db);

    const result = await db.query.goals.findFirst({
      columns: { id: true },
      where: {
        id: data.goalId,
        bucket: { userId: context.userId },
      },
    });

    if (!result) throw new NotFoundError("This goal doesn't exist or may have been removed.");

    return next();
  });
