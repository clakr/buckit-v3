import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { buckets } from "#/db/schema";
import { ConflictError, NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { loadBucketDeletionImpact } from "#/modules/buckets/deletion.server";
import { getBucketsWithFigures } from "#/modules/buckets/figures.server";
import { verifyUserBucketMiddleware } from "#/modules/buckets/middlewares";
import { bucketNameRule } from "#/modules/buckets/name.server";
import {
  editBucketSchema,
  setUpBucketSchema,
  validateBucketNameSchema,
} from "#/modules/buckets/schemas";

export const getBuckets = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const bucketsWithFigures = await getBucketsWithFigures(getDB(env.db), {
      userId: context.userId,
    });

    return bucketsWithFigures.map((bucket) => ({
      id: bucket.id,
      userId: bucket.userId,
      name: bucket.name,
      createdAt: bucket.createdAt,
      subtotals: bucket.subtotals,
    }));
  });

export const getBucket = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBucketMiddleware])
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const bucket = await db.query.buckets.findFirst({
      where: {
        id: data.bucketId,
      },
    });

    if (!bucket) throw new NotFoundError("This bucket doesn't exist or may have been deleted.");

    return bucket;
  });

export const validateBucketName = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(validateBucketNameSchema)
  .handler(async ({ context, data }) =>
    bucketNameRule.check(getDB(env.db), context.userId, {
      name: data.name,
      excludeId: data.excludeId,
    }),
  );

export const setUpBucket = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(setUpBucketSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await bucketNameRule.check(db, context.userId, {
      name: data.name,
    });

    if (!isValid) throw new ConflictError(message);

    return bucketNameRule.write(
      db
        .insert(buckets)
        .values({
          id: uuidv7(),
          userId: context.userId,
          name: data.name,
        })
        .returning(),
    );
  });

export const editBucket = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBucketMiddleware])
  .validator(editBucketSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await bucketNameRule.check(db, context.userId, {
      name: data.name,
      excludeId: data.bucketId,
    });

    if (!isValid) throw new ConflictError(message);

    return bucketNameRule.write(
      db
        .update(buckets)
        .set({
          name: data.name,
        })
        .where(eq(buckets.id, data.bucketId))
        .returning(),
    );
  });

export const getBucketDeletionImpact = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBucketMiddleware])
  .handler(async ({ context, data }) =>
    loadBucketDeletionImpact(getDB(env.db), context.userId, data.bucketId),
  );

export const deleteBucket = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBucketMiddleware])
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    return db.delete(buckets).where(eq(buckets.id, data.bucketId)).returning();
  });
