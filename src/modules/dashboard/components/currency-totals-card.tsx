import type { CurrencyTotals } from "#/modules/dashboard/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { formatMoney } from "#/lib/money";
import { getCurrency, isCurrencyCode } from "#/lib/utils";
import { UnallocatedEarmarkCell } from "#/modules/bank-accounts/components/unallocated-earmark-cell";

type Props = {
  totals: CurrencyTotals;
};

export function CurrencyTotalsCard({ totals }: Props) {
  const { currency, balance, unallocated, totalEarmarked, accountCount } = totals;
  const currencyInfo = isCurrencyCode(currency) ? getCurrency(currency) : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {currencyInfo?.flag} {currency}
        </CardTitle>
        <CardDescription>
          {accountCount} {accountCount === 1 ? "account" : "accounts"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Balance</span>
          <span className="text-2xl font-semibold tabular-nums">
            {formatMoney(balance, currency)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground">Unallocated</span>
          <UnallocatedEarmarkCell
            balance={balance}
            unallocated={unallocated}
            totalEarmarked={totalEarmarked}
            currency={currency}
          />
        </div>
      </CardContent>
    </Card>
  );
}
