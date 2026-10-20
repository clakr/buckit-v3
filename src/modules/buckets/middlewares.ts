import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { verifyUserBucketMiddlewareSchema } from "#/modules/buckets/schemas";

export const verifyUserBucketMiddleware = createMiddleware({
  type: "function",
})
  .middleware([authMiddleware])
  .validator(verifyUserBucketMiddlewareSchema)
  .server(async ({ next, context, data }) => {
    const db = getDB(env.db);

    const result = await db.query.buckets.findFirst({
      where: {
        userId: context.userId,
        id: data.bucketId,
      },
    });

    if (!result) throw new NotFoundError("This bucket doesn't exist or may have been deleted.");

    return next();
  });
