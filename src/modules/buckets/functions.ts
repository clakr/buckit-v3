import type { z } from "zod";

import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { and, eq, ne } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";

import { getDB } from "#/db";
import { buckets, lower } from "#/db/schema";
import { ConflictError, NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/lib/middlewares";
import { verifyUserBucketMiddleware } from "#/modules/buckets/middlewares";
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
    const db = getDB(env.db);

    return db.query.buckets.findMany({
      where: {
        userId: context.user.id,
      },
      with: {
        allocations: {
          with: {
            bankAccount: {
              columns: {
                currency: true,
              },
            },
          },
        },
      },
    });
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
      with: {
        allocations: {
          with: {
            bankAccount: {
              columns: {
                name: true,
                currency: true,
              },
            },
          },
        },
      },
    });

    // Deleted between the middleware's ownership check and this read.
    if (!bucket) throw new NotFoundError("This bucket doesn't exist or may have been deleted.");

    return bucket;
  });

const NAME_TAKEN_MESSAGE = "A bucket with this name already exists.";

// Unique per user, case-insensitive, trimmed (the schemas trim). Renaming a bucket leaves its own
// current name out of the comparison.
async function checkBucketName(
  db: DB,
  userId: string,
  { name, bucketId }: z.output<typeof validateBucketNameSchema>,
) {
  const [taken] = await db
    .select({ id: buckets.id })
    .from(buckets)
    .where(
      and(
        eq(buckets.userId, userId),
        eq(lower(buckets.name), name.toLowerCase()),
        bucketId ? ne(buckets.id, bucketId) : undefined,
      ),
    )
    .limit(1);

  if (taken) return { isValid: false, message: NAME_TAKEN_MESSAGE };

  return { isValid: true, message: "ok" };
}

// Two requests can both pass the check before either writes; the database's unique index then
// rejects the second, which reads the same as a failed check.
function isBucketNameTakenError(error: unknown) {
  for (let cause = error; cause instanceof Error; cause = cause.cause) {
    if (
      cause.message.includes("UNIQUE constraint failed") &&
      (cause.message.includes("buckets_user_id_lower_name_unique") ||
        cause.message.includes("buckets.name"))
    )
      return true;
  }

  return false;
}

export const validateBucketName = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(validateBucketNameSchema)
  .handler(async ({ context, data }) => checkBucketName(getDB(env.db), context.user.id, data));

export const setUpBucket = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(setUpBucketSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await checkBucketName(db, context.user.id, { name: data.name });

    if (!isValid) throw new ConflictError(message);

    try {
      return await db
        .insert(buckets)
        .values({
          id: uuidv7(),
          userId: context.user.id,
          name: data.name,
        })
        .returning();
    } catch (error) {
      if (isBucketNameTakenError(error)) throw new ConflictError(NAME_TAKEN_MESSAGE);

      throw error;
    }
  });

export const editBucket = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBucketMiddleware])
  .validator(editBucketSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await checkBucketName(db, context.user.id, data);

    if (!isValid) throw new ConflictError(message);

    try {
      return await db
        .update(buckets)
        .set({
          name: data.name,
        })
        .where(eq(buckets.id, data.bucketId))
        .returning();
    } catch (error) {
      if (isBucketNameTakenError(error)) throw new ConflictError(NAME_TAKEN_MESSAGE);

      throw error;
    }
  });

export const deleteBucket = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBucketMiddleware])
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    return db.delete(buckets).where(eq(buckets.id, data.bucketId)).returning();
  });
