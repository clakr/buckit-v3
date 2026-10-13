import { IconBucket, IconCredits } from "@tabler/icons-react";

import type { getBankAccount } from "#/modules/bank-accounts/functions";
import type { getBuckets } from "#/modules/buckets/functions";
import type { getBankAccountLinkedDebts } from "#/modules/debts/functions";

import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";
import { DebtStatusBadge } from "#/modules/debts/components/debt-status-badge";
import { getDebtOutstanding, getDebtStatus } from "#/modules/debts/utils";

type Props = {
  bankAccount: NonNullable<Awaited<ReturnType<typeof getBankAccount>>>;
  buckets: Awaited<ReturnType<typeof getBuckets>>;
  linkedDebts: Awaited<ReturnType<typeof getBankAccountLinkedDebts>>;
};

const deletedRecordsList = new Intl.ListFormat("en", { type: "conjunction" });

// The dialog's description: what goes with the account, so the summary below only has to
// cover what survives but changes.
export function getBankAccountDeletionDescription({
  bankAccount,
  linkedDebts,
}: Pick<Props, "bankAccount" | "linkedDebts">) {
  const transactionCount = bankAccount.transactions.length;
  const allocationCount = bankAccount.allocations.length;
  const removedRepaymentCount = linkedDebts
    .flatMap((debt) => debt.repayments)
    .filter((r) => r.transaction?.bankAccountId === bankAccount.id).length;

  const deletedRecords = [
    transactionCount
      ? `${transactionCount} ${transactionCount === 1 ? "transaction" : "transactions"}`
      : null,
    allocationCount
      ? `${allocationCount} ${allocationCount === 1 ? "allocation" : "allocations"}`
      : null,
    removedRepaymentCount
      ? `${removedRepaymentCount} debt ${removedRepaymentCount === 1 ? "repayment" : "repayments"}`
      : null,
  ].filter((part) => part !== null);

  return `Permanently delete "${bankAccount.name}"${deletedRecords.length ? ` with its ${deletedRecordsList.format(deletedRecords)}` : ""}. This cannot be undone.`;
}

// What survives but changes (a bucket's balance, a debt's outstanding) is the part the user
// can't see from the account page, so it gets a before → after table.
export function BankAccountDeletionSummary({ bankAccount, buckets, linkedDebts }: Props) {
  function formatAccountAmount(value: number) {
    return formatCurrency(currencyCodec.encode(value), { currency: bankAccount.currency });
  }

  const allocatedByBucketId = new Map<string, number>();
  for (const allocation of bankAccount.allocations) {
    allocatedByBucketId.set(
      allocation.bucketId,
      (allocatedByBucketId.get(allocation.bucketId) ?? 0) + allocation.amount,
    );
  }

  // A bucket can hold several currencies; only its balance in this account's currency moves.
  const affectedBuckets = buckets
    .filter((bucket) => allocatedByBucketId.has(bucket.id))
    .map((bucket) => {
      const before = bucket.allocations
        .filter((a) => a.bankAccount?.currency === bankAccount.currency)
        .reduce((acc, a) => acc + a.amount, 0);

      return {
        id: bucket.id,
        name: bucket.name,
        before,
        after: before - (allocatedByBucketId.get(bucket.id) ?? 0),
      };
    });

  const affectedDebts = linkedDebts.map((debt) => {
    const remainingRepayments = debt.repayments.filter(
      (r) => r.transaction?.bankAccountId !== bankAccount.id,
    );
    const debtAfter = { ...debt, repayments: remainingRepayments };

    return {
      id: debt.id,
      name: debt.name,
      currency: debt.currency,
      outstandingBefore: getDebtOutstanding(debt),
      outstandingAfter: getDebtOutstanding(debtAfter),
      statusBefore: getDebtStatus(debt),
      statusAfter: getDebtStatus(debtAfter),
      isOrphaned: debt.originatingTransaction?.bankAccountId === bankAccount.id,
    };
  });

  const hasChangesElsewhere = affectedBuckets.length > 0 || affectedDebts.length > 0;

  return (
    <div className="flex flex-col gap-y-3">
      {hasChangesElsewhere ? (
        <table className="w-full tabular-nums">
          <thead className="text-[0.65rem] tracking-wide text-muted-foreground uppercase">
            <tr className="border-b">
              <th className="py-1 text-start font-medium">Changes elsewhere</th>
              <th className="py-1 text-end font-medium">Before</th>
              <th className="py-1 text-end font-medium">After</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {affectedBuckets.map((bucket) => (
              <tr key={bucket.id}>
                <td className="py-1.5">
                  <span className="flex items-center gap-x-1.5">
                    <IconBucket className="size-4 text-muted-foreground" />
                    {bucket.name}
                  </span>
                </td>
                <td className="py-1.5 text-end text-muted-foreground">
                  {formatAccountAmount(bucket.before)}
                </td>
                <td className="py-1.5 text-end font-medium">{formatAccountAmount(bucket.after)}</td>
              </tr>
            ))}
            {affectedDebts.map((debt) => {
              function formatDebtAmount(value: number) {
                return formatCurrency(currencyCodec.encode(value), { currency: debt.currency });
              }

              const isStatusChanged = debt.statusBefore !== debt.statusAfter;

              return (
                <tr key={debt.id} className="align-top">
                  <td className="py-1.5">
                    <span className="flex items-center gap-x-1.5">
                      <IconCredits className="size-4 text-muted-foreground" />
                      {debt.name}
                    </span>
                    {debt.isOrphaned ? (
                      <span className="ps-5.5 text-muted-foreground">loses its source account</span>
                    ) : null}
                  </td>
                  <td className="py-1.5 text-end text-muted-foreground">
                    <span className="flex flex-col items-end gap-y-0.5">
                      {formatDebtAmount(debt.outstandingBefore)}
                      {isStatusChanged ? <DebtStatusBadge status={debt.statusBefore} /> : null}
                    </span>
                  </td>
                  <td className="py-1.5 text-end font-medium">
                    <span className="flex flex-col items-end gap-y-0.5">
                      {formatDebtAmount(debt.outstandingAfter)}
                      {isStatusChanged ? <DebtStatusBadge status={debt.statusAfter} /> : null}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-muted-foreground">Nothing outside this account is affected.</p>
      )}
    </div>
  );
}
