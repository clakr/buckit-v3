import { IconAlertTriangle, IconCalendar, IconInfoCircle } from "@tabler/icons-react";

import { InsetCard, InsetCardTitle, InsetCardContent } from "#/components/inset-card";
import { Button } from "#/components/ui/button";
import { DrawerTrigger } from "#/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#/components/ui/popover";
import { formatMoney } from "#/lib/money";
import { cn, formatDate } from "#/lib/utils";
import { registerBankAccountDrawerHandle } from "#/modules/bank-accounts/components/register-bank-account-drawer";

import type { getBucketGoal } from "../functions";

import {
  getGoalMonthlyAmount,
  getGoalMonthsLeft,
  getGoalPercent,
  getGoalStatus,
  type GoalStatus,
} from "../utils";
import { GoalProgressChart } from "./goal-progress-chart";
import { GoalStatusBadge } from "./goal-status-badge";

type Props = {
  goal: NonNullable<Awaited<ReturnType<typeof getBucketGoal>>>;
};

const STATUS_TONES = {
  reached: "text-emerald-600 dark:text-emerald-400",
  overdue: "text-destructive",
  "in progress": "text-foreground/60",
} satisfies Record<GoalStatus, string>;

export function BucketGoalCard({ goal }: Props) {
  function formatGoalAmount(value: number) {
    return formatMoney(value, goal.currency);
  }

  const { targetAmount, progress } = goal;
  const status = getGoalStatus(goal);
  const percent = getGoalPercent(goal);
  const monthlyAmount = getGoalMonthlyAmount(goal);
  const monthsLeft =
    goal.targetDate && status === "in progress" ? getGoalMonthsLeft(goal.targetDate) : null;

  return (
    <InsetCard>
      <InsetCardTitle action={<GoalStatusBadge status={status} />}>
        Goal
        <Popover>
          <PopoverTrigger
            render={<button type="button" className="text-muted-foreground" />}
            aria-label="What is a Goal?"
          >
            <IconInfoCircle className="size-3.5" aria-hidden />
          </PopoverTrigger>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>What is a Goal?</PopoverTitle>
              <PopoverDescription>
                A savings target on this bucket: a target amount in one currency, with an optional
                target date. It never holds money. Progress is this bucket&apos;s balance in{" "}
                {goal.currency}, so money held in other currencies isn&apos;t counted.
              </PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </InsetCardTitle>
      <InsetCardContent>
        <div className="flex flex-col gap-y-1">
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-3xl font-bold tabular-nums">{formatGoalAmount(progress)}</span>
            <span className="text-muted-foreground">saved</span>
          </p>
          <p className="text-muted-foreground tabular-nums">
            <span className="text-foreground">{formatGoalAmount(targetAmount)}</span> target
          </p>
        </div>

        <div className="flex items-center justify-between gap-x-2 text-muted-foreground">
          <span className="tabular-nums">{percent}% of target</span>
          <span className="inline-flex items-center gap-x-1.5">
            <span className="flex size-5 items-center justify-center rounded-full bg-muted">
              <IconCalendar className="size-3" aria-hidden />
            </span>
            <span className={cn(status === "overdue" && "font-medium text-destructive")}>
              {goal.targetDate ? formatDate(goal.targetDate) : "No target date"}
            </span>
          </span>
        </div>

        <GoalProgressChart
          history={goal.history}
          startedAt={goal.createdAt}
          progress={progress}
          targetAmount={targetAmount}
          className={cn("max-lg:hidden", STATUS_TONES[status])}
        />

        <dl className="flex flex-col gap-y-2 border-t pt-4">
          <div className="flex items-baseline justify-between gap-x-4">
            <dt className="text-muted-foreground">
              {status === "reached" ? "Over target" : "Remaining"}
            </dt>
            <dd
              className={cn(
                "font-medium tabular-nums",
                status === "reached" && "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {formatGoalAmount(Math.abs(targetAmount - progress))}
            </dd>
          </div>
          {monthsLeft !== null ? (
            <div className="flex items-baseline justify-between gap-x-4">
              <dt className="text-muted-foreground">Time left</dt>
              <dd className="font-medium">
                {monthsLeft} {monthsLeft === 1 ? "month" : "months"}
              </dd>
            </div>
          ) : null}
          {monthlyAmount !== null ? (
            <div className="flex items-baseline justify-between gap-x-4">
              <dt className="text-muted-foreground">To set aside</dt>
              <dd className="font-medium tabular-nums">{formatGoalAmount(monthlyAmount)}/month</dd>
            </div>
          ) : null}
        </dl>

        {goal.hasFundingBankAccount ? null : (
          <div className="flex flex-col gap-y-2 border-t pt-4">
            <p className="flex items-center gap-x-2 font-medium">
              <IconAlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
              No {goal.currency} account can fund this Goal
            </p>
            <p className="text-muted-foreground">
              Add a {goal.currency} bank account to keep saving toward it.
            </p>
            <DrawerTrigger
              handle={registerBankAccountDrawerHandle}
              payload={{ currency: goal.currency }}
              render={<Button variant="outline" size="sm" className="w-fit" />}
            >
              Register a/an {goal.currency} account
            </DrawerTrigger>
          </div>
        )}
      </InsetCardContent>
    </InsetCard>
  );
}
