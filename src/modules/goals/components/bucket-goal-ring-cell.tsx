import { format } from "date-fns";

import type { getBuckets } from "#/modules/buckets/functions";

import { ProgressRing } from "#/components/progress-ring";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";

import { getGoalMonthlyAmount, getGoalPercent, getGoalStatus, type GoalStatus } from "../utils";

type Props = {
  goal: Awaited<ReturnType<typeof getBuckets>>[number]["goal"];
};

const STATUS_TONES = {
  reached: "text-emerald-600 dark:text-emerald-400",
  overdue: "text-destructive",
  "in progress": "text-foreground/60",
} satisfies Record<GoalStatus, string>;

export function BucketGoalRingCell({ goal }: Props) {
  if (!goal) return <span className="block text-end text-muted-foreground">—</span>;

  function formatGoalAmount(value: number) {
    if (!goal) return "";

    return formatMoney(value, goal.currency);
  }

  const status = getGoalStatus(goal);
  const percent = getGoalPercent(goal);
  const monthlyAmount = getGoalMonthlyAmount(goal);

  return (
    <div className="ms-auto flex min-w-48 items-center justify-end gap-x-3">
      <div className="flex flex-col items-end">
        {status === "reached" ? (
          <span className={cn("font-semibold uppercase", STATUS_TONES[status])}>Reached</span>
        ) : (
          <span className="font-semibold tabular-nums">{formatGoalAmount(goal.progress)}</span>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {status === "reached"
            ? formatGoalAmount(goal.targetAmount)
            : `of ${formatGoalAmount(goal.targetAmount)}`}
        </span>
        {status === "overdue" && goal.targetDate ? (
          <span className="text-xs font-semibold text-destructive">
            Overdue since {format(goal.targetDate, "MMM yyyy")}
          </span>
        ) : monthlyAmount !== null && goal.targetDate ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatGoalAmount(monthlyAmount)}/mo · by {format(goal.targetDate, "MMM yyyy")}
          </span>
        ) : null}
      </div>
      <ProgressRing
        percent={percent}
        label={`${percent}% of goal saved`}
        className={STATUS_TONES[status]}
      />
    </div>
  );
}
