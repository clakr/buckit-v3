import type { getBuckets } from "#/modules/buckets/functions";

import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";

type Props = Pick<Awaited<ReturnType<typeof getBuckets>>[number], "subtotals" | "accountCount">;

export function BucketSubtotalCell({ subtotals, accountCount }: Props) {
  if (subtotals.length === 0)
    return (
      <div className="ms-auto flex flex-col items-end">
        <span className="font-semibold text-muted-foreground">—</span>
        <span className="text-xs text-muted-foreground">Nothing allocated</span>
      </div>
    );

  return (
    <div className="ms-auto flex flex-col items-end">
      {subtotals.map(({ currency, amount }) => (
        <span
          key={currency}
          className={cn("font-semibold tabular-nums", amount === 0 && "text-muted-foreground")}
        >
          {formatMoney(amount, currency)}
        </span>
      ))}
      <span className="text-xs text-muted-foreground">
        from {accountCount} {accountCount === 1 ? "account" : "accounts"}
      </span>
    </div>
  );
}
