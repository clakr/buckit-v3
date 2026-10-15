import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { NotFoundError } from "#/lib/errors";
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

    // Someone else's bucket reads as missing too, so an ID can't be probed for existence.
    if (!result) throw new NotFoundError("This bucket doesn't exist or may have been deleted.");

    return next();
  });
