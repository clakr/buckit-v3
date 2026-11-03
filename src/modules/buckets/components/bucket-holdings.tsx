import { Link } from "@tanstack/react-router";

import type { Goal } from "#/db/schema";
import type { getBucket } from "#/modules/buckets/functions";

import { formatMoney } from "#/lib/money";
import { AccountStat } from "#/modules/bank-accounts/components/account-stat";

type Props = {
  bucket: Pick<Awaited<ReturnType<typeof getBucket>>, "subtotals" | "holdings">;
  goalCurrency?: Goal["currency"];
};

export function BucketHoldings({ bucket, goalCurrency }: Props) {
  const { subtotals, holdings } = bucket;
  const isShownByGoalCard =
    goalCurrency !== undefined && subtotals.every(({ currency }) => currency === goalCurrency);
  const hasManySources = holdings.length > 1;

  if (!subtotals.length || (isShownByGoalCard && !hasManySources)) return null;

  return (
    <section aria-label="What this bucket holds" className="flex flex-col gap-y-3 border-b p-4">
      {isShownByGoalCard ? null : (
        <dl className="flex flex-wrap items-start gap-x-10 gap-y-3">
          {subtotals.map(({ currency, amount }) => (
            <AccountStat
              key={currency}
              label={subtotals.length > 1 ? `Holds in ${currency}` : "Holds"}
              value={amount}
              currency={currency}
            />
          ))}
        </dl>
      )}

      {hasManySources ? (
        <ul aria-label="Held from each account" className="flex flex-wrap gap-1.5 text-xs">
          {holdings.map(({ bankAccountId, name, currency, amount }) => (
            <li
              key={bankAccountId}
              className="flex items-center gap-x-1.5 rounded-md border bg-muted/50 px-2.5 py-1 whitespace-nowrap"
            >
              <Link
                to="/accounts/$accountId"
                params={{ accountId: bankAccountId }}
                className="text-muted-foreground underline decoration-dotted underline-offset-4"
              >
                {name}
              </Link>
              <span className="font-medium tabular-nums">{formatMoney(amount, currency)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
