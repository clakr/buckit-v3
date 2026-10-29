import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";

import { getDB } from "#/db";
import { distributions } from "#/db/schema";
import { NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { verifyUserDistributionMiddlewareSchema } from "#/modules/distributions/schemas";

export const verifyUserDistributionMiddleware = createMiddleware({
  type: "function",
})
  .middleware([authMiddleware])
  .validator(verifyUserDistributionMiddlewareSchema)
  .server(async ({ next, context, data }) => {
    const db = getDB(env.db);

    const [result] = await db
      .select({ id: distributions.id })
      .from(distributions)
      .where(
        and(eq(distributions.id, data.distributionId), eq(distributions.userId, context.userId)),
      )
      .limit(1);

    if (!result)
      throw new NotFoundError("This distribution doesn't exist or may have been deleted.");

    return next();
  });
