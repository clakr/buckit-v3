import type { BankAccount } from "#/db/schema";

import { ProgressRing } from "#/components/progress-ring";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";

type Props = {
  balance: number;
  unallocated: number;
  totalEarmarked: number;
  currency: BankAccount["currency"];
};

function getEarmarkedPercent({ balance, unallocated, totalEarmarked }: Omit<Props, "currency">) {
  if (balance <= 0) return null;
  if (unallocated <= 0) return 100;

  // Floor so an account with a sliver left never reads as 100% earmarked.
  return Math.floor((totalEarmarked / balance) * 100);
}

export function UnallocatedEarmarkCell({ balance, unallocated, totalEarmarked, currency }: Props) {
  const percent = getEarmarkedPercent({ balance, unallocated, totalEarmarked });
  const isFullyEarmarked = percent === 100;

  const caption = isFullyEarmarked
    ? "Fully earmarked"
    : percent
      ? `${formatMoney(totalEarmarked, currency)} earmarked`
      : null;

  return (
    <div className="ms-auto flex min-w-44 items-center justify-end gap-x-3">
      <div className="flex flex-col items-end">
        <span
          className={cn("font-semibold tabular-nums", unallocated <= 0 && "text-muted-foreground")}
        >
          {formatMoney(unallocated, currency)}
        </span>
        {caption ? (
          <span className="text-xs text-muted-foreground tabular-nums">{caption}</span>
        ) : null}
      </div>

      {percent === null ? (
        <span
          aria-label="Nothing to earmark"
          className="grid size-10 shrink-0 place-items-center text-muted-foreground"
        >
          —
        </span>
      ) : (
        <ProgressRing
          percent={percent}
          label={`${percent}% earmarked`}
          className={
            isFullyEarmarked ? "text-emerald-600 dark:text-emerald-400" : "text-foreground/60"
          }
        />
      )}
    </div>
  );
}
