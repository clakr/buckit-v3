import type { BankAccount } from "#/db/schema";

import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";

type Props = {
  balance: number;
  unallocated: number;
  totalEarmarked: number;
  currency: BankAccount["currency"];
};

const RING_SIZE = 40;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

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
        <div
          className={cn(
            "relative size-10 shrink-0",
            isFullyEarmarked ? "text-emerald-600 dark:text-emerald-400" : "text-foreground/60",
          )}
        >
          <svg
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="size-full -rotate-90"
            role="img"
            aria-label={`${percent}% earmarked`}
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
              className="stroke-muted"
            />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              stroke="currentColor"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - percent / 100)}
            />
          </svg>
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground tabular-nums"
          >
            {percent}%
          </span>
        </div>
      )}
    </div>
  );
}
