import { IconTarget } from "@tabler/icons-react";

import type { getBuckets } from "#/modules/buckets/functions";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { getGoalStatus } from "#/modules/goals/utils";

type BucketRow = Awaited<ReturnType<typeof getBuckets>>[number];

export const BUCKET_GOAL_FILTERS = ["in-progress", "overdue", "reached", "none"] as const;

export type BucketGoalFilter = (typeof BUCKET_GOAL_FILTERS)[number];

const BUCKET_GOAL_FILTER_LABELS = {
  "in-progress": "In Progress",
  overdue: "Overdue",
  reached: "Reached",
  none: "No Goal",
} satisfies Record<BucketGoalFilter, string>;

export function getBucketGoalFilter(goal: BucketRow["goal"]): BucketGoalFilter {
  if (!goal) return "none";

  const status = getGoalStatus(goal);
  return status === "in progress" ? "in-progress" : status;
}

type Props = {
  buckets: BucketRow[];
  selectedGoalFilters: BucketGoalFilter[];
  onSelectedGoalFiltersChange: (goalFilters: BucketGoalFilter[]) => void;
};

export function BucketsGoalFilter({
  buckets,
  selectedGoalFilters,
  onSelectedGoalFiltersChange,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <IconTarget className="mb-0.5 size-3.5" aria-hidden />
        Goal
        {selectedGoalFilters.length ? (
          <Badge variant="outline" className="tabular-nums">
            {selectedGoalFilters.length}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Filter by goal</DropdownMenuLabel>
          {BUCKET_GOAL_FILTERS.map((goalFilter) => (
            <DropdownMenuCheckboxItem
              key={goalFilter}
              checked={selectedGoalFilters.includes(goalFilter)}
              onCheckedChange={(checked) =>
                onSelectedGoalFiltersChange(
                  checked
                    ? [...selectedGoalFilters, goalFilter]
                    : selectedGoalFilters.filter((selected) => selected !== goalFilter),
                )
              }
            >
              {BUCKET_GOAL_FILTER_LABELS[goalFilter]}
              <span className="ms-auto text-muted-foreground tabular-nums">
                {buckets.filter(({ goal }) => getBucketGoalFilter(goal) === goalFilter).length}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {selectedGoalFilters.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelectedGoalFiltersChange([])}>
              Clear Filter
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
