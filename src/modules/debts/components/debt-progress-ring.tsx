import type { Debt } from "#/db/schema";

import { cn } from "#/lib/utils";

type Props = {
  direction: Debt["direction"];
  amount: Debt["amount"];
  outstanding: number;
  repaid: number;
  formatDebtAmount: (value: number) => string;
};

const RING_SIZE = 40;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function DebtProgressRing({
  direction,
  amount,
  outstanding,
  repaid,
  formatDebtAmount,
}: Props) {
  const isOverpaid = outstanding < 0;
  const isSettled = outstanding <= 0;
  const isReceivable = direction === "receivable";

  // Floor so a debt with a sliver left never reads as 100% repaid.
  const percentRepaid = isSettled
    ? 100
    : amount === 0
      ? 0
      : Math.floor((Math.min(repaid, amount) / amount) * 100);

  const toneText = isReceivable
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-amber-600 dark:text-amber-400";
  const ringTone = isOverpaid
    ? toneText
    : isSettled
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-foreground/60";

  return (
    <div className="ms-auto flex min-w-40 items-center justify-end gap-x-3">
      <div className="flex flex-col items-end">
        {isOverpaid ? (
          <span className={cn("font-semibold uppercase", toneText)}>
            Overpaid +{formatDebtAmount(-outstanding)}
          </span>
        ) : isSettled ? (
          <span className={cn("font-semibold uppercase", ringTone)}>Paid in full</span>
        ) : (
          <span className="font-semibold tabular-nums">{formatDebtAmount(outstanding)}</span>
        )}
        {repaid === 0 ? null : (
          <span className="text-xs text-muted-foreground tabular-nums">
            {isSettled && !isOverpaid ? formatDebtAmount(amount) : `of ${formatDebtAmount(amount)}`}
          </span>
        )}
      </div>

      <div className={cn("relative size-10 shrink-0", ringTone)}>
        <svg
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="size-full -rotate-90"
          role="img"
          aria-label={`${percentRepaid}% repaid`}
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
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - percentRepaid / 100)}
          />
        </svg>
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground tabular-nums"
        >
          {percentRepaid}%
        </span>
      </div>
    </div>
  );
}
