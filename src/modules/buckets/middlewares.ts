import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { authMiddleware } from "#/lib/middlewares";
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
        userId: context.user.id,
        id: data.bucketId,
      },
    });

    if (!result) throw new Error("No bucket is linked to this user");

    return next();
  });
