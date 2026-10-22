import { Card, CardAction, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { formatMoney } from "#/lib/money";
import { formatDate } from "#/lib/utils";

import type { getBucketGoal } from "../functions";

import { getGoalStatus } from "../utils";
import { GoalStatusBadge } from "./goal-status-badge";

type Props = {
  goal: NonNullable<Awaited<ReturnType<typeof getBucketGoal>>>;
};

export function BucketGoalCard({ goal }: Props) {
  function formatGoalAmount(value: number) {
    return formatMoney(value, goal.currency);
  }

  const { targetAmount, progress } = goal;
  const status = getGoalStatus(goal);
  const remaining = Math.max(targetAmount - progress, 0);
  const percent = Math.max(Math.floor((progress / targetAmount) * 100), 0);
  const barPercent = Math.min(percent, 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goal</CardTitle>
        <CardAction>
          <GoalStatusBadge status={status} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-1.5">
          <div className="flex items-baseline justify-between gap-x-4 tabular-nums">
            <span className="text-lg font-semibold">{formatGoalAmount(progress)}</span>
            <span className="text-muted-foreground">
              {percent}% of {formatGoalAmount(targetAmount)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Goal progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={barPercent}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full bg-foreground/60" style={{ width: `${barPercent}%` }} />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Target</dt>
            <dd className="font-semibold tabular-nums">{formatGoalAmount(targetAmount)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Saved</dt>
            <dd className="font-semibold tabular-nums">{formatGoalAmount(progress)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Remaining</dt>
            <dd className="font-semibold tabular-nums">{formatGoalAmount(remaining)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Target Date</dt>
            <dd className="font-semibold">
              {goal.targetDate ? formatDate(goal.targetDate) : "No date"}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
