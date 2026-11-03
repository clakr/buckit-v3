import { IconArrowDownRight, IconArrowUpRight, IconMinus } from "@tabler/icons-react";

import type { BankAccount } from "#/db/schema";

import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { getNetChangeTone } from "#/modules/bank-accounts/components/net-change-cell";
import { BALANCE_TREND_DAYS } from "#/modules/bank-accounts/utils";

type Props = {
  label: string;
  value: number;
  change?: number;
  currency: BankAccount["currency"];
};

export function AccountStat({ label, value, change, currency }: Props) {
  return (
    <div className="flex flex-col gap-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{formatMoney(value, currency)}</dd>
      {change === undefined ? null : (
        <dd className="flex items-center gap-x-1 text-xs">
          <AccountStatChange change={change} currency={currency} />
          <span className="text-muted-foreground">vs {BALANCE_TREND_DAYS}d ago</span>
        </dd>
      )}
    </div>
  );
}

function AccountStatChange({
  change,
  currency,
}: {
  change: number;
  currency: BankAccount["currency"];
}) {
  const Icon = change > 0 ? IconArrowUpRight : change < 0 ? IconArrowDownRight : IconMinus;

  return (
    <span
      className={cn(
        "flex items-center gap-x-0.5 font-medium tabular-nums",
        getNetChangeTone(change),
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {change > 0 ? "+" : ""}
      {formatMoney(change, currency)}
    </span>
  );
}
