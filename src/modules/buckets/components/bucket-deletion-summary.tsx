import { IconBuildingBank } from "@tabler/icons-react";

import type { getBankAccounts } from "#/modules/bank-accounts/functions";
import type { getBucket } from "#/modules/buckets/functions";

import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";
import { getBankAccountUnallocatedBalance } from "#/modules/bank-accounts/utils";

type Props = {
  bucket: NonNullable<Awaited<ReturnType<typeof getBucket>>>;
  bankAccounts: Awaited<ReturnType<typeof getBankAccounts>>;
};

// The dialog's description: what goes with the bucket, so the summary below only has to
// cover what survives but changes.
export function getBucketDeletionDescription({ bucket }: Pick<Props, "bucket">) {
  const allocationCount = bucket.allocations.length;

  return `Permanently delete "${bucket.name}"${allocationCount ? ` with its ${allocationCount} ${allocationCount === 1 ? "allocation" : "allocations"}` : ""}. This cannot be undone.`;
}

// Same shape as `BankAccountDeletionSummary`: what survives but changes. Here that's only
// each account's unallocated balance — the money stays in the account, it just stops
// being earmarked.
export function BucketDeletionSummary({ bucket, bankAccounts }: Props) {
  const releasedByBankAccountId = new Map<string, number>();
  for (const allocation of bucket.allocations) {
    releasedByBankAccountId.set(
      allocation.bankAccountId,
      (releasedByBankAccountId.get(allocation.bankAccountId) ?? 0) + allocation.amount,
    );
  }

  const affectedBankAccounts = bankAccounts
    .filter((account) => releasedByBankAccountId.has(account.id))
    .map((account) => {
      const { unallocated } = getBankAccountUnallocatedBalance(account);

      return {
        id: account.id,
        name: account.name,
        currency: account.currency,
        unallocatedBefore: unallocated,
        unallocatedAfter: unallocated + (releasedByBankAccountId.get(account.id) ?? 0),
      };
    });

  return (
    <div className="flex flex-col gap-y-3">
      {affectedBankAccounts.length ? (
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
              {affectedBankAccounts.map((account) => {
                function formatAccountAmount(value: number) {
                  return formatCurrency(currencyCodec.encode(value), {
                    currency: account.currency,
                  });
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
