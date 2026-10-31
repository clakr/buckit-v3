import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { getBankAccountsWithFiguresAndTrend } from "#/modules/bank-accounts/figures.server";
import { getBalanceTrendWindowStart } from "#/modules/bank-accounts/utils";
import { getBucketsWithFigures } from "#/modules/buckets/figures.server";
import { getRecentLedgerMovements } from "#/modules/dashboard/activity.server";
import { getCurrencySummaries } from "#/modules/dashboard/utils";
import { getDebtsWithFigures } from "#/modules/debts/figures.server";
import { getGoalProgress } from "#/modules/goals/utils";

export const getDashboard = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDB(env.db);

    const [bankAccounts, debts, bucketsWithFigures, bucketGoals, firstAllocation, distributions] =
      await Promise.all([
        getBankAccountsWithFiguresAndTrend(db, { userId: context.userId }),
        getDebtsWithFigures(db, { userId: context.userId }),
        getBucketsWithFigures(db, { userId: context.userId }),
        db.query.goals.findMany({
          columns: { bucketId: true, targetAmount: true, currency: true, targetDate: true },
          where: { bucket: { userId: context.userId } },
        }),
        db.query.allocations.findFirst({
          columns: { id: true },
          where: { bankAccount: { userId: context.userId } },
        }),
        db.query.distributions.findMany({
          columns: { id: true, name: true },
          where: { userId: context.userId },
          with: { bankAccount: { columns: { currency: true } } },
        }),
      ]);

    const recentLedgerMovements = await getRecentLedgerMovements(db, {
      userId: context.userId,
      currencies: [...new Set(bankAccounts.map((bankAccount) => bankAccount.currency))],
    });

    const goalByBucketId = new Map(bucketGoals.map((goal) => [goal.bucketId, goal]));
    const buckets = bucketsWithFigures.map((bucket) => {
      const goal = goalByBucketId.get(bucket.id);

      return {
        id: bucket.id,
        name: bucket.name,
        goal: goal ? { ...goal, progress: getGoalProgress(bucket.subtotals, goal.currency) } : null,
      };
    });

    // The account an Allocation starts from when the Dashboard has to pick one: the one with the
    // most Unallocated money, since that is the one that can actually fund it.
    const [fundingBankAccount] = [...bankAccounts].sort((a, b) => b.unallocated - a.unallocated);

    return {
      gettingStarted: {
        fundingBankAccountId: fundingBankAccount?.id ?? null,
        hasBucket: bucketsWithFigures.length > 0,
        hasAllocation: firstAllocation !== undefined,
      },
      distributions: distributions.map((distribution) => ({
        id: distribution.id,
        name: distribution.name,
        currency: distribution.bankAccount.currency,
      })),
      currencySummaries: getCurrencySummaries(bankAccounts, debts, buckets, recentLedgerMovements),
      trendWindowStart: getBalanceTrendWindowStart(new Date()).getTime(),
    };
  });
