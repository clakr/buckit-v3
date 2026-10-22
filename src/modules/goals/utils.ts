import { startOfToday } from "date-fns";

import type { Goal } from "#/db/schema";
import type { BucketSubtotal } from "#/modules/buckets/figures.server";

export type GoalStatus = "reached" | "overdue" | "in progress";

export function getGoalProgress(subtotals: BucketSubtotal[], currency: Goal["currency"]) {
  return subtotals.find((subtotal) => subtotal.currency === currency)?.amount ?? 0;
}

export function getGoalStatus({
  targetAmount,
  targetDate,
  progress,
}: Pick<Goal, "targetAmount" | "targetDate"> & { progress: number }): GoalStatus {
  if (progress >= targetAmount) return "reached";
  if (targetDate && targetDate < startOfToday()) return "overdue";

  return "in progress";
}
