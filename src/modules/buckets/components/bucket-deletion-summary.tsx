import { IconBuildingBank } from "@tabler/icons-react";

import type { getBucketDeletionImpact } from "#/modules/buckets/functions";

import { formatMoney } from "#/lib/money";

type Props = {
  impact: Awaited<ReturnType<typeof getBucketDeletionImpact>>;
};

export function getBucketDeletionDescription({ impact }: Props) {
  const { bucket, allocationCount } = impact;

  return `Permanently delete "${bucket.name}"${allocationCount ? ` with its ${allocationCount} ${allocationCount === 1 ? "allocation" : "allocations"}` : ""}. This cannot be undone.`;
}

export function BucketDeletionSummary({ impact }: Props) {
  return (
    <div className="flex flex-col gap-y-3">
      {impact.bankAccounts.length ? (
        <>
          <table className="w-full tabular-nums">
            <thead className="text-[0.65rem] tracking-wide text-muted-foreground uppercase">
              <tr className="border-b">
                <th className="py-1 text-start font-medium">Unallocated in</th>
                <th className="py-1 text-end font-medium">Before</th>
                <th className="py-1 text-end font-medium">After</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {impact.bankAccounts.map((account) => {
                function formatAccountAmount(value: number) {
                  return formatMoney(value, account.currency);
                }

                return (
                  <tr key={account.id}>
                    <td className="py-1.5">
                      <span className="flex items-center gap-x-1.5">
                        <IconBuildingBank className="size-4 text-muted-foreground" />
                        {account.name}
                      </span>
                    </td>
                    <td className="py-1.5 text-end text-muted-foreground">
                      {formatAccountAmount(account.unallocatedBefore)}
                    </td>
                    <td className="py-1.5 text-end font-semibold">
                      {formatAccountAmount(account.unallocatedAfter)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-muted-foreground">Account balances don't change.</p>
        </>
      ) : (
        <p className="text-muted-foreground">Nothing outside this bucket is affected.</p>
      )}
    </div>
  );
}
