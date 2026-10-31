import type { ReactNode } from "react";

import type { CurrencySummary } from "#/modules/dashboard/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { BalanceTrendSparkline } from "#/modules/bank-accounts/components/balance-trend-sparkline";
import { NetChangeCell } from "#/modules/bank-accounts/components/net-change-cell";

type KpiTileProps = {
  label: string;
  value: string;
  valueClassName?: string;
  footer: ReactNode;
  aside?: ReactNode;
};

function KpiTile({ label, value, valueClassName, footer, aside }: KpiTileProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className={cn("text-2xl font-semibold tabular-nums", valueClassName)}>
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-x-3 text-muted-foreground">
        <div className="text-xs">{footer}</div>
        {aside}
      </CardContent>
    </Card>
  );
}

type KpiTilesProps = {
  summary: CurrencySummary;
};

export function KpiTiles({ summary }: KpiTilesProps) {
  const { currency, balance, unallocated, earmarked, trend } = summary;
  const netDebts = summary.receivableOutstanding - summary.payableOutstanding;

  return (
    <section
      aria-label={`${currency} overview`}
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <KpiTile
        label="Balance"
        value={formatMoney(balance, currency)}
        footer={<NetChangeCell trend={trend} currency={currency} />}
        aside={<BalanceTrendSparkline trend={trend} currency={currency} />}
      />
      <KpiTile
        label="Unallocated"
        value={formatMoney(unallocated, currency)}
        footer="Not earmarked to any Bucket"
      />
      <KpiTile
        label="Earmarked in Buckets"
        value={formatMoney(earmarked, currency)}
        footer="Allocated, minus Withdrawals"
      />
      <KpiTile
        label="Net debts"
        value={formatMoney(netDebts, currency)}
        valueClassName={netDebts < 0 ? "text-amber-600 dark:text-amber-400" : undefined}
        footer={
          <>
            <div>{formatMoney(summary.receivableOutstanding, currency)} owed to you</div>
            <div>{formatMoney(summary.payableOutstanding, currency)} you owe</div>
          </>
        }
      />
    </section>
  );
}
