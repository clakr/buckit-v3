import type { Debt } from "#/db/schema";

import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatDate, formatToRelative } from "#/lib/utils";

type Props = {
  date: Debt["date"];
  lastRepaymentDate: Date | null;
  repaymentCount: number;
};

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

export function DebtActivityCell({ date, lastRepaymentDate, repaymentCount }: Props) {
  return (
    <div className="flex flex-col">
      <span className="font-semibold">
        {lastRepaymentDate ? (
          <RelativeDate date={lastRepaymentDate} prefix="Last repaid " />
        ) : (
          "No repayments yet"
        )}
      </span>
      <span className="text-xs text-muted-foreground">
        <RelativeDate date={date} prefix="Recorded " />
        {repaymentCount > 0
          ? ` · ${repaymentCount === 1 ? "1 repayment" : `${repaymentCount} repayments`}`
          : null}
      </span>
    </div>
  );
}
