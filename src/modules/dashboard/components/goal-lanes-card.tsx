import { IconTarget } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { BucketGoalRingCell } from "#/modules/goals/components/bucket-goal-ring-cell";
import { GoalStatusBadge } from "#/modules/goals/components/goal-status-badge";
import { getGoalStatus } from "#/modules/goals/utils";

import type { CurrencySummary } from "../utils";

type Props = {
  summary: CurrencySummary;
};

const VISIBLE_LANES = 4;

export function GoalLanesCard({ summary }: Props) {
  const { currency, goalLanes } = summary;
  const visibleLanes = goalLanes.slice(0, VISIBLE_LANES);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goals</CardTitle>
        <CardDescription>{currency} Goals, Overdue first, then nearest target date</CardDescription>
      </CardHeader>
      <CardContent>
        {visibleLanes.length > 0 ? (
          <ul className="divide-y">
            {visibleLanes.map(({ bucketId, bucketName, goal }) => (
              <li key={bucketId}>
                <Link
                  to="/buckets/$bucketId"
                  params={{ bucketId }}
                  className="flex items-center justify-between gap-x-3 py-3 hover:bg-muted/50"
                >
                  <div className="flex min-w-0 flex-col items-start gap-y-1">
                    <span className="max-w-full truncate font-semibold">{bucketName}</span>
                    <GoalStatusBadge status={getGoalStatus(goal)} />
                  </div>
                  <BucketGoalRingCell goal={{ bucketId, ...goal }} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <StateTemplate
            state="empty"
            icon={<IconTarget />}
            title={`No ${currency} Goals`}
            description={`Add a Goal in ${currency} to a Bucket to track progress toward a target.`}
            content={
              <Button nativeButton={false} render={<Link to="/buckets" />}>
                Go to Buckets
              </Button>
            }
          />
        )}
      </CardContent>
      {goalLanes.length > VISIBLE_LANES ? (
        <CardFooter>
          <Button variant="link" nativeButton={false} render={<Link to="/buckets" />}>
            View all {goalLanes.length} Goals in Buckets
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
