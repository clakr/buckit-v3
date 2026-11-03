import type { getBuckets } from "#/modules/buckets/functions";

import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatDate, formatToRelative } from "#/lib/utils";

type Props = Pick<
  Awaited<ReturnType<typeof getBuckets>>[number],
  "createdAt" | "lastMovedDate" | "allocationCount" | "withdrawalCount"
>;

const DAY_MS = 86_400_000;

function formatRelativeDate(date: Date) {
  return Date.now() - date.getTime() < DAY_MS ? "today" : formatToRelative(date);
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
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="flex flex-col text-start" />}>
        <span className="font-semibold">
          {lastMovedDate ? `Last moved ${formatRelativeDate(lastMovedDate)}` : "No movement yet"}
        </span>
        <span className="text-xs text-muted-foreground">
          Created {formatRelativeDate(createdAt)}
        </span>
      </TooltipTrigger>
      <TooltipContent className="flex flex-col items-start">
        {lastMovedDate ? <span>Last moved {formatDate(lastMovedDate)}</span> : null}
        <span>Created {formatDate(createdAt)}</span>
        <span>
          {formatCount(allocationCount, "allocation")} ·{" "}
          {formatCount(withdrawalCount, "withdrawal")}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
