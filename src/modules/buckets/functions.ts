import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { and, eq, ne } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

import { getDB } from "#/db";
import { buckets, lower } from "#/db/schema";
import { authMiddleware } from "#/lib/middlewares";
import { verifyUserBucketMiddleware } from "#/modules/buckets/middlewares";
import { addBucketSchema, editBucketSchema } from "#/modules/buckets/schemas";

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

    return bucket ?? null;
  });

export const validateBucketName = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(z.string().trim())
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const result = await db
      .select({
        id: buckets.id,
        name: buckets.name,
      })
      .from(buckets)
      .where(
        and(
          eq(buckets.userId, context.session.userId),
          eq(lower(buckets.name), data.toLowerCase()),
        ),
      )
      .limit(1);

    if (result.length > 0) {
      return {
        isValid: false,
        message: "A bucket with this name already exists.",
      };
    }

    return { isValid: true, message: "ok" };
  });

export const addBucket = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(addBucketSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await validateBucketName({
      data: data.name,
    });

    if (!isValid) throw new Error(message);

    return db
      .insert(buckets)
      .values({
        id: uuidv7(),
        userId: context.session.userId,
        name: data.name,
      })
      .returning();
  });

export const validateEditBucketName = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBucketMiddleware])
  .validator(editBucketSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const result = await db
      .select({
        id: buckets.id,
        name: buckets.name,
      })
      .from(buckets)
      .where(
        and(
          eq(buckets.userId, context.session.userId),
          eq(lower(buckets.name), data.name.toLowerCase()),
          ne(buckets.id, data.bucketId),
        ),
      )
      .limit(1);

    if (result.length > 0) {
      return {
        isValid: false,
        message: "A bucket with this name already exists.",
      };
    }

    return { isValid: true, message: "ok" };
  });

export const editBucket = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBucketMiddleware])
  .validator(editBucketSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await validateEditBucketName({
      data,
    });

    if (!isValid) throw new Error(message);

    return db
      .update(buckets)
      .set({
        name: data.name,
      })
      .where(eq(buckets.id, data.bucketId))
      .returning();
  });
