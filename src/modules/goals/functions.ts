import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { goals } from "#/db/schema";
import { ConflictError } from "#/lib/errors";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { getBucketsWithFigures } from "#/modules/buckets/figures.server";
import { verifyUserBucketMiddleware } from "#/modules/buckets/middlewares";
import { addGoalSchema } from "#/modules/goals/schemas";
import { getGoalProgress } from "#/modules/goals/utils";

export const getBucketGoal = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBucketMiddleware])
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const [goal, [bucket]] = await Promise.all([
      db.query.goals.findFirst({
        where: { bucketId: data.bucketId, bucket: { userId: context.userId } },
      }),
      getBucketsWithFigures(db, { userId: context.userId, bucketId: data.bucketId }),
    ]);

    if (!goal || !bucket) return null;

    return { ...goal, progress: getGoalProgress(bucket.subtotals, goal.currency) };
  });

export const getGoalCurrencies = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const bankAccounts = await getDB(env.db).query.bankAccounts.findMany({
      columns: { currency: true },
      where: { userId: context.userId },
    });

    return [...new Set(bankAccounts.map((bankAccount) => bankAccount.currency))].sort();
  });

export const addGoal = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBucketMiddleware])
  .validator(addGoalSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const [existingGoal, fundingBankAccount] = await Promise.all([
      db.query.goals.findFirst({ columns: { id: true }, where: { bucketId: data.bucketId } }),
      db.query.bankAccounts.findFirst({
        columns: { id: true },
        where: { userId: context.userId, currency: data.currency },
      }),
    ]);

    if (existingGoal) throw new ConflictError("This bucket already has a goal.");
    if (!fundingBankAccount)
      throw new ConflictError(`None of your bank accounts use ${data.currency}.`);

    const [goal] = await db
      .insert(goals)
      .values({
        id: uuidv7(),
        bucketId: data.bucketId,
        targetAmount: data.targetAmount,
        currency: data.currency,
        targetDate: data.targetDate,
      })
      .returning();

    return goal;
  });
