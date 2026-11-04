import { formatMoney } from "#/lib/money";
import { formatLowestTriggerable, type DistributionRow } from "#/modules/distributions/attention";

export function DistributionAmountFigures({ distribution }: { distribution: DistributionRow }) {
  const { amount, bankAccount, lowestTriggerableCents } = distribution;

  return (
    <>
      <span className="font-semibold tabular-nums">
        {formatMoney(amount, bankAccount.currency)}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatLowestTriggerable(lowestTriggerableCents, bankAccount.currency)}
      </span>
    </>
  );
}
