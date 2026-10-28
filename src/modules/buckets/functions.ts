import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { buckets, goals } from "#/db/schema";
import { ConflictError, NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { loadBucketDeletionImpact } from "#/modules/buckets/deletion.server";
import { getBucketActivities, getBucketsWithFigures } from "#/modules/buckets/figures.server";
import { loadBucketLedger } from "#/modules/buckets/ledger.server";
import { verifyUserBucketMiddleware } from "#/modules/buckets/middlewares";
import { bucketNameRule } from "#/modules/buckets/name.server";
import { editBucketSchema, validateBucketNameSchema } from "#/modules/buckets/schemas";
import { findFundingBankAccount } from "#/modules/goals/funding.server";
import { setUpBucketWithGoalSchema } from "#/modules/goals/schemas";
import { getGoalProgress } from "#/modules/goals/utils";

export const getBuckets = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDB(env.db);

    const [bucketsWithFigures, activityByBucketId, bucketGoals] = await Promise.all([
      getBucketsWithFigures(db, { userId: context.userId }),
      getBucketActivities(db, { userId: context.userId }),
      db.query.goals.findMany({
        columns: { bucketId: true, targetAmount: true, currency: true, targetDate: true },
        where: { bucket: { userId: context.userId } },
      }),
    ]);

    const goalByBucketId = new Map(bucketGoals.map((goal) => [goal.bucketId, goal]));

    return bucketsWithFigures.map((bucket) => {
      const goal = goalByBucketId.get(bucket.id);
      const activity = activityByBucketId.get(bucket.id);

      return {
        id: bucket.id,
        userId: bucket.userId,
        name: bucket.name,
        createdAt: bucket.createdAt,
        subtotals: bucket.subtotals,
        accountCount: bucket.heldByBankAccount.length,
        lastMovedDate: activity?.lastMovedDate ?? null,
        allocationCount: activity?.allocationCount ?? 0,
        withdrawalCount: activity?.withdrawalCount ?? 0,
        goal: goal ? { ...goal, progress: getGoalProgress(bucket.subtotals, goal.currency) } : null,
      };
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
    });

    if (!bucket) throw new NotFoundError("This bucket doesn't exist or may have been deleted.");

    return bucket;
  });

export const getBucketLedger = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBucketMiddleware])
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const [[bucket], ledger] = await Promise.all([
      getBucketsWithFigures(db, { userId: context.userId, bucketId: data.bucketId }),
      loadBucketLedger(db, data.bucketId),
    ]);

    if (!bucket) throw new NotFoundError("This bucket doesn't exist or may have been deleted.");

    const bankAccountNameById = new Map(
      ledger.map(({ bankAccount }) => [bankAccount.id, bankAccount.name]),
    );

    return {
      subtotals: bucket.subtotals,
      holdings: bucket.heldByBankAccount
        .filter(({ amount }) => amount !== 0)
        .map((held) => ({ ...held, name: bankAccountNameById.get(held.bankAccountId) ?? "" }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      ledger,
    };
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
  .validator(setUpBucketWithGoalSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);
    const { goal } = data;

    const [{ isValid, message }, fundingBankAccount] = await Promise.all([
      bucketNameRule.check(db, context.userId, { name: data.name }),
      goal ? findFundingBankAccount(db, { userId: context.userId, currency: goal.currency }) : null,
    ]);

    if (!isValid) throw new ConflictError(message);
    if (goal && !fundingBankAccount)
      throw new ConflictError(`None of your bank accounts use ${goal.currency}.`);

    const bucketId = uuidv7();
    const insertBucket = db
      .insert(buckets)
      .values({
        id: bucketId,
        userId: context.userId,
        name: data.name,
      })
      .returning();

    if (!goal) return bucketNameRule.write(insertBucket);

    // One batch is one D1 transaction, so a failed Goal insert never leaves the Bucket behind.
    const [bucketRows] = await bucketNameRule.write(
      db.batch([
        insertBucket,
        db.insert(goals).values({
          id: uuidv7(),
          bucketId,
          targetAmount: goal.targetAmount,
          currency: goal.currency,
          targetDate: goal.targetDate,
        }),
      ]),
    );

    return bucketRows;
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
