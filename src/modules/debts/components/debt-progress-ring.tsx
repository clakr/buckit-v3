import type { Debt } from "#/db/schema";

import { ProgressRing } from "#/components/progress-ring";
import { cn } from "#/lib/utils";

type Props = {
  direction: Debt["direction"];
  amount: Debt["amount"];
  outstanding: number;
  repaid: number;
  formatDebtAmount: (value: number) => string;
};

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

      <ProgressRing
        percent={percentRepaid}
        label={`${percentRepaid}% repaid`}
        className={ringTone}
      />
    </div>
  );
}
