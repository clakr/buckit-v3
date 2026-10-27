import { IconArrowDownRight, IconArrowUpRight, IconMinus } from "@tabler/icons-react";

import type { BankAccount } from "#/db/schema";
import type { BalanceTrend } from "#/modules/bank-accounts/utils";

import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { BALANCE_TREND_DAYS } from "#/modules/bank-accounts/utils";

type Props = {
  trend: BalanceTrend;
  currency: BankAccount["currency"];
};

export function getNetChangeTone(net: number) {
  if (net > 0) return "text-emerald-600 dark:text-emerald-400";
  if (net < 0) return "text-amber-600 dark:text-amber-400";

  return "text-foreground/60";
}

export function NetChangeCell({ trend, currency }: Props) {
  const { net, hasActivity } = trend;
  const Icon = net > 0 ? IconArrowUpRight : net < 0 ? IconArrowDownRight : IconMinus;

  return (
    <div className="flex flex-col items-end">
      {hasActivity ? (
        <span
          className={cn(
            "flex items-center gap-x-1 font-semibold tabular-nums",
            getNetChangeTone(net),
          )}
        >
          <Icon className="size-4" />
          {net > 0 ? "+" : ""}
          {formatMoney(net, currency)}
        </span>
      ) : (
        <span className="text-muted-foreground">No activity</span>
      )}
      <span className="text-xs text-muted-foreground">last {BALANCE_TREND_DAYS} days</span>
    </div>
  );
}
