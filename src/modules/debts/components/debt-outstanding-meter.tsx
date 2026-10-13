import { IconAlertTriangle, IconCashPlus, IconInfoCircle } from "@tabler/icons-react";

import type { Debt } from "#/db/schema";

import { Button } from "#/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { cn } from "#/lib/utils";

type Props = {
  direction: Debt["direction"];
  amount: Debt["amount"];
  // Negative when overpaid.
  outstanding: number;
  repaymentsCount: number;
  formatDebtAmount: (value: number) => string;
};

// Repayment progress as a bar. An overpayment isn't an error, so instead of a negative figure the
// excess overflows past the full bar, in a tone that depends on direction: a receivable overpaid
// is in the user's favour (emerald), a payable overpaid is money they should get back (amber).
export function DebtOutstandingMeter({
  direction,
  amount,
  outstanding,
  repaymentsCount,
  formatDebtAmount,
}: Props) {
  const repaid = amount - outstanding;
  const isOverpaid = outstanding < 0;
  const isReceivable = direction === "receivable";

  const total = Math.max(amount, repaid);
  const repaidWidth = total === 0 ? 0 : (Math.min(repaid, amount) / total) * 100;
  const overpaidWidth = total === 0 || !isOverpaid ? 0 : (-outstanding / total) * 100;

  const toneText = isReceivable
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-amber-600 dark:text-amber-400";
  const TriggerIcon = isOverpaid
    ? isReceivable
      ? IconCashPlus
      : IconAlertTriangle
    : IconInfoCircle;

  return (
    <div className="ms-auto flex w-40 flex-col items-end gap-y-1">
      <div className="flex items-center gap-x-1 font-semibold">
        {repaymentsCount > 0 ? (
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("size-5", isOverpaid ? toneText : "text-muted-foreground")}
                  aria-label="Show repayment breakdown"
                />
              }
            >
              <TriggerIcon className="size-3.5" />
            </PopoverTrigger>
            <PopoverContent className="w-fit max-w-72" align="end">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <dt className="text-muted-foreground">Original amount</dt>
                <dd className="text-end font-semibold tabular-nums">{formatDebtAmount(amount)}</dd>

                <dt className="text-muted-foreground">
                  Repaid ({repaymentsCount} repayment{repaymentsCount > 1 ? "s" : null})
                </dt>
                <dd className="text-end font-semibold tabular-nums">{formatDebtAmount(repaid)}</dd>

                {isOverpaid ? (
                  <>
                    <dt className={toneText}>Overpaid</dt>
                    <dd className={cn("text-end font-semibold tabular-nums", toneText)}>
                      {formatDebtAmount(-outstanding)}
                    </dd>
                  </>
                ) : null}
              </dl>
              {isOverpaid ? (
                <p className="text-muted-foreground">
                  {isReceivable
                    ? "They paid you more than they owed — a credit in your favour."
                    : "You paid more than you owed. Ask for the difference back."}
                </p>
              ) : null}
            </PopoverContent>
          </Popover>
        ) : null}

        {isOverpaid ? (
          <span className={cn("uppercase", toneText)}>
            Overpaid +{formatDebtAmount(-outstanding)}
          </span>
        ) : (
          <span>{formatDebtAmount(outstanding)}</span>
        )}
      </div>

      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-foreground/60" style={{ width: `${repaidWidth}%` }} />
        {isOverpaid ? (
          <div
            className={cn(
              "h-full border-l-2 border-background",
              isReceivable ? "bg-emerald-500" : "bg-amber-500",
            )}
            style={{ width: `${overpaidWidth}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}
