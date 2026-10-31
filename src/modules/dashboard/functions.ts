import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { getBankAccountsWithFiguresAndTrend } from "#/modules/bank-accounts/figures.server";
import { getBalanceTrendWindowStart } from "#/modules/bank-accounts/utils";
import { getBucketsWithFigures } from "#/modules/buckets/figures.server";
import { getCurrencySummaries } from "#/modules/dashboard/utils";
import { getDebtsWithFigures } from "#/modules/debts/figures.server";
import { getGoalProgress } from "#/modules/goals/utils";

export const getDashboard = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDB(env.db);

    const [bankAccounts, debts, bucketsWithFigures, bucketGoals] = await Promise.all([
      getBankAccountsWithFiguresAndTrend(db, { userId: context.userId }),
      getDebtsWithFigures(db, { userId: context.userId }),
      getBucketsWithFigures(db, { userId: context.userId }),
      db.query.goals.findMany({
        columns: { bucketId: true, targetAmount: true, currency: true, targetDate: true },
        where: { bucket: { userId: context.userId } },
      }),
    ]);

    const goalByBucketId = new Map(bucketGoals.map((goal) => [goal.bucketId, goal]));
    const buckets = bucketsWithFigures.map((bucket) => {
      const goal = goalByBucketId.get(bucket.id);

      return {
        id: bucket.id,
        name: bucket.name,
        goal: goal ? { ...goal, progress: getGoalProgress(bucket.subtotals, goal.currency) } : null,
      };
    });

    return {
      currencySummaries: getCurrencySummaries(bankAccounts, debts, buckets),
      trendWindowStart: getBalanceTrendWindowStart(new Date()).getTime(),
    };
  });
