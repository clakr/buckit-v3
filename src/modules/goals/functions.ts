import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { goals } from "#/db/schema";
import { ConflictError, NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { getBucketsWithFigures } from "#/modules/buckets/figures.server";
import { verifyUserBucketMiddleware } from "#/modules/buckets/middlewares";
import { findFundingBankAccount } from "#/modules/goals/funding.server";
import { getGoalProgressHistory } from "#/modules/goals/history.server";
import { verifyUserGoalMiddleware } from "#/modules/goals/middlewares";
import {
  addGoalSchema,
  editGoalSchema,
  isTargetDateTodayOrLater,
  TARGET_DATE_IN_PAST_MESSAGE,
} from "#/modules/goals/schemas";
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

    const [fundingBankAccount, history] = await Promise.all([
      findFundingBankAccount(db, { userId: context.userId, currency: goal.currency }),
      getGoalProgressHistory(db, { bucketId: goal.bucketId, currency: goal.currency }),
    ]);

    return {
      ...goal,
      progress: getGoalProgress(bucket.subtotals, goal.currency),
      history,
      hasFundingBankAccount: Boolean(fundingBankAccount),
    };
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
      findFundingBankAccount(db, { userId: context.userId, currency: data.currency }),
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

export const editGoal = createServerFn({
  method: "POST",
})
  .middleware([verifyUserGoalMiddleware])
  .validator(editGoalSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const goal = await db.query.goals.findFirst({
      columns: { targetDate: true },
      where: { id: data.goalId },
    });

    if (!goal) throw new NotFoundError("This goal doesn't exist or may have been removed.");

    const isTargetDateChanged = data.targetDate?.getTime() !== goal.targetDate?.getTime();

    if (isTargetDateChanged && data.targetDate && !isTargetDateTodayOrLater(data.targetDate))
      throw new ConflictError(TARGET_DATE_IN_PAST_MESSAGE);

    const [updatedGoal] = await db
      .update(goals)
      .set({ targetAmount: data.targetAmount, targetDate: data.targetDate })
      .where(eq(goals.id, data.goalId))
      .returning();

    return updatedGoal;
  });

export const removeGoal = createServerFn({
  method: "POST",
})
  .middleware([verifyUserGoalMiddleware])
  .handler(async ({ data }) => {
    return getDB(env.db).delete(goals).where(eq(goals.id, data.goalId)).returning();
  });
