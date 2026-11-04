import type { Debt, Goal } from "#/db/schema";
import type { SavedDistribution } from "#/modules/distributions/functions";

import { formatMoney } from "#/lib/money";
import {
  computeDistributionPlan,
  getDebtLineWarnings,
  getLowestTriggerableCents,
  savedLinesToPlanLines,
  type DebtLineWarning,
} from "#/modules/distributions/utils";

export type BucketTargetFigures = {
  id: string;
  name: string;
  goal: (Pick<Goal, "targetAmount"> & { progress: number }) | null;
};

export type DebtTargetFigures = Pick<Debt, "id" | "name" | "direction"> & {
  outstanding: number;
  status: "open" | "settled" | "forgiven";
};

export type DistributionTargetFigures = {
  bucketsById: Map<string, BucketTargetFigures>;
  debtsById: Map<string, DebtTargetFigures>;
};

export function indexTargetFigures(
  buckets: BucketTargetFigures[],
  debts: DebtTargetFigures[],
): DistributionTargetFigures {
  return {
    bucketsById: new Map(buckets.map((bucket) => [bucket.id, bucket])),
    debtsById: new Map(debts.map((debt) => [debt.id, debt])),
  };
}

export type DistributionAttention = DebtLineWarning | { kind: "goal-reached"; bucketId: string };

export function getAttentionTargetId(attention: DistributionAttention) {
  return attention.kind === "goal-reached" ? attention.bucketId : attention.debtId;
}

export function getDistributionAttention(
  plan: ReturnType<typeof computeDistributionPlan>,
  { bucketsById, debtsById }: DistributionTargetFigures,
): DistributionAttention[] {
  const reachedGoals = plan.plannedLines.flatMap((line): DistributionAttention[] => {
    if (line.kind !== "bucket" || line.cents <= 0) return [];

    const goal = bucketsById.get(line.id)?.goal;

    return goal && goal.progress >= goal.targetAmount
      ? [{ kind: "goal-reached", bucketId: line.id }]
      : [];
  });

  return [...reachedGoals, ...getDebtLineWarnings(plan.plannedLines, [...debtsById.values()])];
}

export function describeAttentionReason(
  attention: DistributionAttention,
  formatAmount: (cents: number) => string,
) {
  switch (attention.kind) {
    case "overpays":
      return `Overpays by ${formatAmount(attention.overpaidByCents ?? 0)}`;
    case "settled":
      return "Settled";
    case "forgiven":
      return "Forgiven";
    case "goal-reached":
      return "Goal reached";
  }
}

export function formatLowestTriggerable(lowestTriggerableCents: number | null, currency: string) {
  if (lowestTriggerableCents === null) return "Works with most amounts";
  if (lowestTriggerableCents <= 1) return "Works with any amount";

  return `Works from ${formatMoney(lowestTriggerableCents, currency)}`;
}

export function toDistributionRow(
  distribution: SavedDistribution,
  figures: DistributionTargetFigures,
) {
  const planLines = savedLinesToPlanLines(distribution.lines);
  const plan = computeDistributionPlan(planLines, distribution.amount);

  return {
    ...distribution,
    plan,
    attention: getDistributionAttention(plan, figures),
    lowestTriggerableCents: getLowestTriggerableCents(planLines),
  };
}

export type DistributionRow = ReturnType<typeof toDistributionRow>;

export function sortDistributionsByAttention(rows: DistributionRow[]) {
  return [...rows].sort(
    (a, b) =>
      Number(b.attention.length > 0) - Number(a.attention.length > 0) ||
      a.name.localeCompare(b.name),
  );
}
