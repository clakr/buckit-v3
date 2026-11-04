import { IconChevronDown } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { Stat } from "#/components/stat";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { cn } from "#/lib/utils";
import {
  type BucketTargetFigures,
  type DebtTargetFigures,
  type DistributionRow,
} from "#/modules/distributions/attention";

type UnplannedTarget = { id: string; name: string };

type Props = {
  distributions: DistributionRow[];
  allDistributions: DistributionRow[];
  buckets: BucketTargetFigures[];
  debts: DebtTargetFigures[];
};

export function DistributionsOverview({ distributions, allDistributions, buckets, debts }: Props) {
  const plannedIds = new Set(
    allDistributions.flatMap(({ lines }) => lines.map(({ targetId }) => targetId)),
  );
  const openGoalBuckets = buckets.filter(
    ({ goal }) => goal !== null && goal.progress < goal.targetAmount,
  );
  const openPayables = debts.filter(
    ({ direction, status }) => direction === "payable" && status === "open",
  );

  const accountCount = new Set(distributions.map(({ bankAccount }) => bankAccount.id)).size;
  const needsALook = distributions.filter(({ attention }) => attention.length > 0);
  const [firstNeedsALook] = needsALook;

  return (
    <dl
      aria-label="Distributions overview"
      className="flex divide-x *:min-w-0 *:flex-1 *:px-4 *:first:ps-0 *:last:pe-0 max-sm:-mx-4 max-sm:snap-x max-sm:scroll-px-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:*:min-w-48 max-sm:*:shrink-0 max-sm:*:snap-start"
    >
      <Stat label="Distributions" value={distributions.length}>
        <dd className="text-xs text-muted-foreground">
          Into {accountCount} {accountCount === 1 ? "account" : "accounts"}
        </dd>
      </Stat>
      <Stat
        label="Needs a look"
        value={
          <span className={cn(needsALook.length > 0 && "text-amber-600 dark:text-amber-400")}>
            {needsALook.length}
          </span>
        }
      >
        <dd className="truncate text-xs text-muted-foreground">
          {firstNeedsALook
            ? `${firstNeedsALook.name}${needsALook.length > 1 ? ` · +${needsALook.length - 1} more` : ""}`
            : "Every line is on track"}
        </dd>
      </Stat>
      {openGoalBuckets.length ? (
        <UnplannedStat
          label="Goals not in any distribution"
          targets={openGoalBuckets.filter(({ id }) => !plannedIds.has(id))}
          emptyText="Every open goal is planned"
          to="/buckets/$bucketId"
        />
      ) : null}
      {openPayables.length ? (
        <UnplannedStat
          label="Payables not in any distribution"
          targets={openPayables.filter(({ id }) => !plannedIds.has(id))}
          emptyText="Every open payable is planned"
          to="/debts/$debtId"
        />
      ) : null}
    </dl>
  );
}

function UnplannedStat({
  label,
  targets,
  emptyText,
  to,
}: {
  label: string;
  targets: UnplannedTarget[];
  emptyText: string;
  to: "/buckets/$bucketId" | "/debts/$debtId";
}) {
  const [firstTarget] = targets;

  return (
    <Stat label={label} value={targets.length}>
      <dd className="flex min-w-0 items-center gap-x-1 text-xs text-muted-foreground">
        {firstTarget ? (
          <>
            <TargetLink target={firstTarget} to={to} className="truncate" />
            {targets.length > 1 ? (
              <Popover>
                <PopoverTrigger className="flex shrink-0 items-center gap-x-0.5 underline decoration-dotted underline-offset-4 hover:text-foreground">
                  +{targets.length - 1} more
                  <IconChevronDown aria-hidden className="size-3.5" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto min-w-56">
                  <ul aria-label={label} className="flex flex-col gap-y-1.5">
                    {targets.map((target) => (
                      <li key={target.id}>
                        <TargetLink target={target} to={to} />
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            ) : null}
          </>
        ) : (
          <span className="truncate">{emptyText}</span>
        )}
      </dd>
    </Stat>
  );
}

function TargetLink({
  target,
  to,
  className,
}: {
  target: UnplannedTarget;
  to: "/buckets/$bucketId" | "/debts/$debtId";
  className?: string;
}) {
  const linkClassName = cn(
    "underline decoration-dotted underline-offset-4 hover:text-foreground",
    className,
  );

  return to === "/buckets/$bucketId" ? (
    <Link to={to} params={{ bucketId: target.id }} title={target.name} className={linkClassName}>
      {target.name}
    </Link>
  ) : (
    <Link to={to} params={{ debtId: target.id }} title={target.name} className={linkClassName}>
      {target.name}
    </Link>
  );
}
