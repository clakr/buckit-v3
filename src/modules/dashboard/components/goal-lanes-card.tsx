import { IconPlus, IconTarget } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { InsetCard, InsetCardContent, InsetCardFooter } from "#/components/inset-card";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { CardDescription, CardTitle } from "#/components/ui/card";
import { DrawerTrigger } from "#/components/ui/drawer";
import { MODULE_ICONS } from "#/lib/constants";
import { setUpBucketDrawerHandle } from "#/modules/buckets/components/set-up-bucket-drawer";
import { BucketGoalRingCell } from "#/modules/goals/components/bucket-goal-ring-cell";
import { GoalStatusBadge } from "#/modules/goals/components/goal-status-badge";
import { getGoalStatus } from "#/modules/goals/utils";

import type { CurrencySummary } from "../utils";

type Props = {
  summary: CurrencySummary;
};

const VISIBLE_LANES = 5;

export function GoalLanesCard({ summary }: Props) {
  const { currency, goalLanes } = summary;
  const visibleLanes = goalLanes.slice(0, VISIBLE_LANES);

  return (
    <InsetCard>
      <InsetCardContent>
        <div className="flex flex-col gap-y-1">
          <CardTitle>Goals</CardTitle>
          <CardDescription>
            {currency} Goals, Overdue first, then nearest target date
          </CardDescription>
        </div>

        {visibleLanes.length > 0 ? (
          <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
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
          />
        )}
        {goalLanes.length > VISIBLE_LANES ? (
          <p className="shrink-0 text-center text-muted-foreground">
            Showing {VISIBLE_LANES} of {goalLanes.length} Goals
          </p>
        ) : null}
      </InsetCardContent>
      <InsetCardFooter>
        <DrawerTrigger handle={setUpBucketDrawerHandle} render={<Button variant="outline" />}>
          <IconPlus />
          Create Goal
        </DrawerTrigger>
        <Button nativeButton={false} render={<Link to="/buckets" />}>
          <MODULE_ICONS.buckets />
          View All
        </Button>
      </InsetCardFooter>
    </InsetCard>
  );
}
