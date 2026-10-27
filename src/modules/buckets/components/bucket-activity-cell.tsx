import type { getBuckets } from "#/modules/buckets/functions";

import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatDate, formatToRelative } from "#/lib/utils";

type Props = Pick<
  Awaited<ReturnType<typeof getBuckets>>[number],
  "createdAt" | "lastMovedDate" | "allocationCount" | "withdrawalCount"
>;

const DAY_MS = 86_400_000;

function RelativeDate({ date, prefix }: { date: Date; prefix: string }) {
  const relative = Date.now() - date.getTime() < DAY_MS ? "today" : formatToRelative(date);

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="text-start" />}>
        {prefix}
        {relative}
      </TooltipTrigger>
      <TooltipContent>{formatDate(date)}</TooltipContent>
    </Tooltip>
  );
}

function formatCount(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

export function BucketActivityCell({
  createdAt,
  lastMovedDate,
  allocationCount,
  withdrawalCount,
}: Props) {
  const counts = [
    allocationCount > 0 ? formatCount(allocationCount, "allocation") : null,
    withdrawalCount > 0 ? formatCount(withdrawalCount, "withdrawal") : null,
  ].filter(Boolean);

  return (
    <div className="flex max-w-56 flex-col whitespace-normal">
      <span className="font-semibold">
        {lastMovedDate ? (
          <RelativeDate date={lastMovedDate} prefix="Last moved " />
        ) : (
          "No movement yet"
        )}
      </span>
      <span className="text-xs text-muted-foreground">
        <RelativeDate date={createdAt} prefix="Created " />
        {counts.length > 0 ? ` · ${counts.join(" · ")}` : null}
      </span>
    </div>
  );
}
